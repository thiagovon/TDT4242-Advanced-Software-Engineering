# TDT4242-Advanced-Software-Engineering

## 1. High-Level Overview

**AI Guidebook for Students** is a full-stack web application for transparent AI usage declaration in academic settings. Students generate, edit, and submit declarations of their AI tool usage during assignments. The system combines automated interaction logging with manual declaration forms, integrity monitoring, structured reflection, and an append-only audit trail.

**Tech stack**: React 18 + TypeScript on Vite (client), Express.js 4 + TypeScript with SQLite via `better-sqlite3` (server), npm workspaces for monorepo management. Testing uses Vitest + Testing Library + jest-axe for accessibility. The app follows WCAG 2.1 AA accessibility standards throughout.

---

## 2. Project Structure

```
ASWE/
├── package.json                  # Root — npm workspaces (client/, server/)
├── CLAUDE.md                     # Project analysis instructions
├── README.md                     # This file
├── data/
│   └── ai_guidebook.db           # SQLite database (WAL mode)
├── server/
│   ├── package.json              # Express, better-sqlite3, tsx, TypeScript
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Express app entry point (port 3001)
│       ├── db/
│       │   ├── index.ts          # DB connection + init (WAL, FK pragma)
│       │   ├── schema.ts         # 10 CREATE TABLE statements
│       │   └── seed.ts           # Demo data (2 assignments, ~15 logs)
│       └── routes/
│           ├── index.ts          # Route aggregator (/api/*)
│           ├── assignments.ts    # CRUD for assignments
│           ├── interactions.ts   # Log queries, scoping, unassigned queue
│           ├── declarations.ts   # Declaration CRUD, entries, reflection, submit
│           ├── manualEntries.ts  # Manual usage entry CRUD
│           ├── versionHistory.ts # Append-only audit snapshots
│           ├── regenerate.ts     # Re-generate draft from new logs
│           └── validate.ts       # Server-side reflection validation
├── client/
│   ├── package.json              # React, Vite, vitest, Testing Library
│   ├── vite.config.ts            # Dev proxy /api → :3001, jsdom test env
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── guidance.json         # Runtime-configurable help content
│   └── src/
│       ├── main.tsx              # React DOM entry point
│       ├── App.tsx               # 4-step wizard, providers, layout
│       ├── index.css             # WCAG 2.1 AA design tokens, global styles
│       ├── types/api.ts          # TypeScript interfaces mirroring DB schema
│       ├── events/
│       │   ├── eventBus.ts       # mitt singleton
│       │   └── types.ts          # 13 domain event types
│       ├── contexts/
│       │   ├── WarningsContext.tsx   # Integrity warnings state (reducer)
│       │   └── ReflectionContext.tsx # Reflection validity state
│       ├── hooks/
│       │   ├── useApi.ts         # Fetch wrapper (get/post/patch/delete)
│       │   └── useGuidance.ts    # Load guidance.json at runtime
│       ├── services/
│       │   └── VersionHistoryService/index.ts  # Snapshot event subscriber
│       ├── components/
│       │   └── HelpSection.tsx   # Toggleable help dialog
│       ├── modules/
│       │   ├── DraftEditorModule/     # Draft generation, entry editing
│       │   │   ├── index.tsx
│       │   │   ├── EntryRow.tsx       # Inline edit/delete with origin tracking
│       │   │   ├── OriginBadge.tsx    # Color-coded origin metadata
│       │   │   └── UnassignedQueue.tsx # Resolve unassigned interactions
│       │   ├── IntegrityMonitor/      # 4 warning conditions, event-driven
│       │   │   ├── index.ts
│       │   │   └── WarningBanner.tsx
│       │   ├── ReflectionModule/      # Two prompts, ≥25 words, repetition check
│       │   │   ├── index.tsx
│       │   │   └── validation.ts
│       │   ├── ManualUsageModule/index.tsx  # 4-field manual entry form
│       │   ├── ReviewAggregator/index.tsx   # Read-only preview, 2-step confirm
│       │   └── StatsPanel/index.tsx         # Real-time coverage stats
│       └── test/
│           └── setup.ts           # vitest setup (jsdom, jest-dom)
```

---

## 3. Server Deep-Dive

### Entry Point (`server/src/index.ts`)
Express server on port 3001 (configurable via `PORT` env var). Middleware:
- **CORS**: allows origin `http://localhost:5173` (Vite dev server)
- **Body parsing**: `express.json()`
- **Static serving**: serves `client/dist` in production with SPA fallback

Routes are mounted under `/api` via the aggregated router.

### Database (`server/src/db/`)
- **SQLite** via `better-sqlite3` (synchronous, no async overhead)
- **WAL mode** + `PRAGMA foreign_keys = ON`
- **10 tables** (all `CREATE IF NOT EXISTS` — idempotent):

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `assignments` | Instructor-defined time periods | course_id, title, period_start, period_end |
| `interaction_logs` | AI usage events | assignment_id (nullable), tool_name, category, origin_tag |
| `declarations` | One per assignment per student | status (draft/submitted), time_period_locked_at |
| `declaration_entries` | Individual declaration fields | origin (auto-generated/modified/manual), diff_delta |
| `manual_usage_entries` | Manually declared usage | tool_name, date_range, reason (enum) |
| `reflections` | Two structured prompts | prompt1, prompt2, is_valid, word counts |
| `version_history` | Append-only audit trail | trigger_event, snapshot_data (JSON), active_warnings |

- **Seed data**: 2 assignments for "INF3490 — Biologically Inspired Computing", ~15 interaction logs with mix of assigned/unassigned and student_tagged/inferred/unassigned origins.

### Routing (`server/src/routes/`)

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| **assignments.ts** | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | Assignment CRUD; PATCH returns affected in-progress declaration count |
| **interactions.ts** | `GET /` (with `?scoped=true`), `GET /unassigned`, `GET /nearby`, `POST /:id/assign` | Time-scoped log queries, unassigned queue resolution |
| **declarations.ts** | `GET /:id`, `GET /by-assignment/:id`, `POST /`, `POST /:id/entries`, `PATCH /:id/entries/:eid`, `DELETE /:id/entries/:eid`, `PATCH /:id/reflection`, `POST /:id/save`, `POST /:id/submit` | Full declaration lifecycle |
| **manualEntries.ts** | `POST /:id/manual-entries`, `DELETE /:id/manual-entries/:eid` | Manual usage entry CRUD with validation (≥15 words) |
| **versionHistory.ts** | `GET /:declId`, `GET /:declId/:snapId`, `POST /:declId` | Append-only snapshot management |
| **regenerate.ts** | `POST /:id/regenerate` | Re-generate draft from new scoped logs, with pre/post snapshots |
| **validate.ts** | `POST /reflection` | Server-side reflection validation (word count, repetition) |

### Middleware
No custom middleware beyond CORS and body parsing. Auth is **not implemented** (hardcoded demo student).

### Config
- `PORT` env var (default 3001)
- Database path relative to project root (`../data/ai_guidebook.db`)
- No `.env` file; no secrets handling

---

## 4. Client Deep-Dive

### Entry Point & Framework
React 18.3.1 with TypeScript, bootstrapped via `main.tsx` into `#root` with `StrictMode`.

### Root Component (`App.tsx`)
A **4-step wizard**:
1. **Draft** — `DraftEditorModule` + `StatsPanel` sidebar
2. **Reflection** — `ReflectionModule` (gated on declaration existence)
3. **Manual** — `ManualUsageModule` (gated)
4. **Review** — `ReviewAggregator` (gated)

Layout uses CSS Grid (1fr | 1fr 320px on draft step). Wrapped in `WarningsProvider` and `ReflectionProvider` contexts. Hardcoded `DEMO_ASSIGNMENT_ID = 'assign-001'`.

### State Management
- **React Context API**: `WarningsContext` (reducer: ADD/CLEAR/CLEAR_ALL warnings), `ReflectionContext` (simple useState for validity)
- **Event Bus** (mitt): 13 typed domain events for loose coupling between modules — no direct imports between DraftEditor, IntegrityMonitor, ManualModule, etc.
- **Lifted state in App**: `currentStep`, `entries`, `manualEntryCount`, `declarationId`

### Module Breakdown

**DraftEditorModule** — Generates declaration entries from scoped interaction logs. Each `EntryRow` supports inline editing (React Hook Form), origin tracking (auto-generated → auto-generated-modified on edit), diff deltas, and deletion with event emission. `UnassignedQueue` displays unassigned interactions for student resolution. `OriginBadge` renders color-coded origin metadata (blue/orange/green).

**IntegrityMonitor** — Pure logic hook (no UI), subscribes to events and raises 4 advisory warning conditions: (a) entry deleted without replacement, (b) content significantly reduced, (c) coverage below 60%, (d) logged tool not mentioned. `WarningBanner` reads from WarningsContext with `aria-live="assertive"`.

**ReflectionModule** — Two structured prompts requiring ≥25 words each with 3-gram repetition detection. Real-time validation via `useWatch`, syncs to ReflectionContext and server.

**ManualUsageModule** — 4-field form (tool, date range, description ≥15 words, reason dropdown) for declaring unlogged AI usage.

**ReviewAggregator** — Read-only preview of all declaration data. Creates `review_step` snapshot on entry. Two-step confirmation: checkbox (acknowledges warnings if any) → submit button. Server enforces reflection validity.

**StatsPanel** — Sticky sidebar showing coverage %, tools used, categories, activity period. Highlights discrepancy when coverage < 60%.

### API Integration (`hooks/useApi.ts`)
Thin fetch wrapper with JSON headers. All modules call `api.get/post/patch/delete` targeting `/api/*` routes (proxied to :3001 in dev).

### Client-Side Routing
No router library — step navigation managed by `currentStep` state in App.tsx with conditional rendering.

### Styling (`index.css`)
CSS custom properties (design tokens) with WCAG 2.1 AA compliant colors. Skip-to-main link, focus-visible outlines (3px), system font stack. No CSS framework — plain CSS with semantic class names.

### Build Tooling
Vite 5.4.11 with `@vitejs/plugin-react`. Path alias `@` → `src/`. Dev proxy `/api` → `http://localhost:3001`. Production build outputs to `dist/` (~215 KB).

---

## 5. Cross-Cutting Concerns

### Authentication/Authorization
**Not implemented.** Hardcoded `DEMO_STUDENT_ID` and `DEMO_ASSIGNMENT_ID`. All endpoints are open.

### Data Validation
- **Client**: React Hook Form + custom `validateReflection()` (word count, repetition). Manual entries validated for required fields and word minimums.
- **Server**: Duplicate validation on `POST /validate/reflection` and `POST /submit` (reflection must be valid). Manual entries validated server-side (required fields, ≥15 words, enum reasons). Returns 400/422 with structured error objects.

### Error Handling
- **Server**: HTTP status codes (200, 201, 400, 404, 409, 422) with `{ error: string }` or `{ errors: [] }` JSON bodies.
- **Client**: `useApi` throws on non-OK responses. Components catch errors into local state and display inline.

### Shared Types/Constants
TypeScript interfaces in `client/src/types/api.ts` mirror the server's database schema. No shared code package between client and server — types are maintained independently.

### Audit Trail
Append-only `version_history` table with JSON snapshots at 6 trigger points: `initial_open`, `review_step`, `submission`, `manual_save`, `pre_regeneration`, `post_regeneration`. VersionHistoryService subscribes to `DECLARATION_SNAPSHOT` events.

---

## 6. Key Dependencies

| Dependency | Role |
|-----------|------|
| **express** 4.21.2 | HTTP framework |
| **better-sqlite3** 11.6.0 | Synchronous SQLite driver |
| **cors** 2.8.5 | Cross-origin middleware |
| **react** 18.3.1 | UI framework |
| **react-hook-form** 7.54.2 | Form state and validation |
| **mitt** 3.0.1 | Typed event bus (<1 KB) |
| **vite** 5.4.11 | Build tool and dev server |
| **tsx** 4.19.2 | TypeScript execution for server dev |
| **vitest** 2.1.8 | Test runner |
| **@testing-library/react** 16.1.0 | Component testing utilities |
| **jest-axe** 10.0.0 | Accessibility assertion library |
| **@playwright/test** 1.49.1 | E2E testing |

---

## 7. How to Run It

```bash
# Install all dependencies (root + workspaces)
npm install

# Development (concurrent client + server)
npm run dev
# → Client: http://localhost:5173
# → Server: http://localhost:3001

# Build for production
npm run build

# Run production server (serves client build)
npm run start -w server

# Run tests
npm test                          # vitest (client unit tests)
npm run test:watch -w client      # watch mode
npm run test:a11y -w client       # Playwright accessibility tests
```

**Database** auto-initializes on first server start (schema + seed data). Located at `data/ai_guidebook.db` with WAL mode.
