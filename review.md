# Code Review Report — AI Guidebook for Students

## Step 1: Codebase Overview

| Metric | Value |
|--------|-------|
| **Total source files** | ~57 (excl. lock files, node_modules) |
| **Client LOC** | ~3,800 |
| **Server LOC** | ~1,100 |
| **Test LOC** | ~700 |
| **Tech stack** | React 18 + TypeScript + Vite / Express + better-sqlite3 |
| **Architecture** | 4-step wizard, event bus (mitt), Context API, RESTful API |
| **Tests** | 69 passing (vitest + jest-axe + playwright) |

### Project Structure

```
ASWE/
├── client/
│   └── src/
│       ├── App.tsx                          (191 lines) — Root wizard component
│       ├── index.css                        (79 lines)  — WCAG 2.1 AA design tokens
│       ├── types/api.ts                     (75 lines)  — Shared API response types
│       ├── events/
│       │   ├── eventBus.ts                  (26 lines)  — mitt singleton
│       │   └── types.ts                     (143 lines) — 13 domain event definitions
│       ├── contexts/
│       │   ├── WarningsContext.tsx           (63 lines)  — Integrity warnings state
│       │   └── ReflectionContext.tsx         (54 lines)  — Reflection validity state
│       ├── hooks/
│       │   ├── useApi.ts                    (25 lines)  — Fetch wrapper
│       │   └── useGuidance.ts               (56 lines)  — Runtime guidance.json loader
│       ├── services/
│       │   └── VersionHistoryService/       (52 lines)  — Append-only snapshot subscriber
│       ├── components/
│       │   └── HelpSection.tsx              (78 lines)  — Toggleable help dialog
│       └── modules/
│           ├── DraftEditorModule/
│           │   ├── index.tsx                (339 lines) — Draft generation & entry editing
│           │   ├── EntryRow.tsx             (246 lines) — Inline edit/delete with origin tracking
│           │   ├── OriginBadge.tsx          (64 lines)  — Color-coded origin badge
│           │   └── UnassignedQueue.tsx      (149 lines) — Unassigned interactions resolver
│           ├── IntegrityMonitor/
│           │   ├── index.ts                 (195 lines) — 4 warning condition checks
│           │   └── WarningBanner.tsx        (65 lines)  — Warning display with aria-live
│           ├── ReflectionModule/
│           │   ├── index.tsx                (257 lines) — Two-prompt reflection form
│           │   └── validation.ts            (70 lines)  — Word count & repetition validation
│           ├── ManualUsageModule/
│           │   └── index.tsx                (401 lines) — 4-field manual usage entry form
│           ├── ReviewAggregator/
│           │   └── index.tsx                (313 lines) — Read-only preview + 2-step confirm
│           └── StatsPanel/
│               └── index.tsx                (255 lines) — Sticky sidebar statistics
├── server/
│   └── src/
│       ├── index.ts                         (44 lines)  — Express entry point
│       ├── db/
│       │   ├── index.ts                     (35 lines)  — DB connection (WAL, FK pragma)
│       │   ├── schema.ts                    (141 lines) — 10 CREATE TABLE statements
│       │   └── seed.ts                      (224 lines) — Demo seed data
│       └── routes/
│           ├── index.ts                     (28 lines)  — Route aggregator
│           ├── assignments.ts               (94 lines)  — Assignment CRUD
│           ├── interactions.ts              (126 lines) — Log queries, scoping, unassigned queue
│           ├── declarations.ts              (259 lines) — Declaration lifecycle
│           ├── manualEntries.ts             (81 lines)  — Manual usage entry CRUD
│           ├── versionHistory.ts            (117 lines) — Append-only snapshot management
│           ├── regenerate.ts                (106 lines) — Draft re-generation
│           └── validate.ts                  (55 lines)  — Server-side reflection validation
└── data/
    └── ai_guidebook.db                      — SQLite database
```

### Application Purpose

**AI Guidebook for Students** is a full-stack, WCAG 2.1 AA compliant web application for transparent AI usage declaration in academic settings. It follows a 4-step wizard flow:

1. **Draft Step** — Auto-generates declaration entries from scoped interaction logs
2. **Reflection Step** — Two structured prompts with word count and repetition validation
3. **Manual Step** — Declare AI usage not captured by the logging system
4. **Review Step** — Read-only preview with two-step confirmation and warning acknowledgment

Key architectural features: event bus for cross-module communication, append-only version history for audit trails, and an integrity monitor that raises advisory warnings when declarations appear to underrepresent logged AI usage.

---

## Step 2 & 3: File-by-File Analysis and Cross-Cutting Concerns

The analysis below covers every significant source file, evaluated for responsibility, size, complexity, dependencies, and error handling. Cross-cutting patterns are identified where they span multiple files.

---

## Step 4: Code Smell Findings

---

### 1. Duplicated `countWords` Function

**File(s):** `client/src/modules/ManualUsageModule/index.tsx:39`, `client/src/modules/ReflectionModule/validation.ts:11`, `server/src/routes/manualEntries.ts:14`, `server/src/routes/validate.ts:14`

**Severity:** Major
**Category:** Duplication

**Description:**
The identical `countWords` function is defined **four separate times** across the codebase. Any behavioral change (e.g., handling non-breaking spaces or em-dashes) would require updating four files — a classic "shotgun surgery" smell.

**Before (Current Code — repeated in 4 files):**
```typescript
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

**Recommended Fix:**
Create a shared utility module and import it everywhere:

```typescript
// shared/utils/text.ts (new shared package or copied to both client/server)
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

Then import in each consumer:
```typescript
import { countWords } from '../../shared/utils/text';
```

**Reasoning:**
DRY principle. A single source of truth prevents divergence and makes the behavior testable in one place. Since client and server share TypeScript, a `shared/` package or simple copy is straightforward.

---

### 2. Duplicated `CONDITION_LABELS` / `WARNING_CONDITION_LABELS` Map

**File(s):** `client/src/modules/IntegrityMonitor/WarningBanner.tsx:10`, `client/src/modules/ReviewAggregator/index.tsx:24`

**Severity:** Minor
**Category:** Duplication

**Description:**
Two identical label maps for `WarningCondition` values exist under different names. If a new warning condition is added, both must be updated.

**Before (WarningBanner.tsx:10):**
```typescript
const CONDITION_LABELS: Record<WarningCondition, string> = {
  entry_deleted: 'Entry deleted',
  scope_reduced: 'Scope reduction detected',
  coverage_low: 'Low coverage',
  tool_missing: 'AI tool not mentioned',
};
```

**Before (ReviewAggregator/index.tsx:24):**
```typescript
const WARNING_CONDITION_LABELS: Record<WarningCondition, string> = {
  entry_deleted: 'Entry deleted',
  scope_reduced: 'Scope reduction detected',
  coverage_low: 'Low coverage',
  tool_missing: 'AI tool not mentioned',
};
```

**Recommended Fix:**
Export the map once from the events/types module:

```typescript
// events/types.ts — add at bottom
export const WARNING_CONDITION_LABELS: Record<WarningCondition, string> = {
  entry_deleted: 'Entry deleted',
  scope_reduced: 'Scope reduction detected',
  coverage_low: 'Low coverage',
  tool_missing: 'AI tool not mentioned',
};
```

Then import it in both `WarningBanner.tsx` and `ReviewAggregator/index.tsx`.

**Reasoning:**
Single source of truth. Adding a fifth warning condition would otherwise require finding both definitions.

---

### 3. Duplicated `COVERAGE_THRESHOLD` Constant

**File(s):** `client/src/modules/IntegrityMonitor/index.ts:24`, `client/src/modules/StatsPanel/index.tsx:16`

**Severity:** Minor
**Category:** Duplication / Primitive Obsession

**Description:**
The magic number `0.6` is defined as `COVERAGE_THRESHOLD` in two separate files. If the business rule changes (e.g., 50% or 70%), both must be updated.

**Before (IntegrityMonitor/index.ts:24):**
```typescript
export const COVERAGE_THRESHOLD = 0.6;
```

**Before (StatsPanel/index.tsx:16):**
```typescript
const COVERAGE_THRESHOLD = 0.6;
```

**Recommended Fix:**
Export it from a single shared constants file or from IntegrityMonitor (which already exports it) and import it in StatsPanel:

```typescript
// StatsPanel/index.tsx
import { COVERAGE_THRESHOLD } from '../IntegrityMonitor';
```

**Reasoning:**
Prevents divergence when the coverage threshold business rule changes.

---

### 4. Duplicated Inline Style Objects (Pervasive)

**File(s):** All component files — `App.tsx`, `DraftEditorModule/index.tsx`, `EntryRow.tsx`, `ManualUsageModule/index.tsx`, `ReviewAggregator/index.tsx`, `StatsPanel/index.tsx`, `UnassignedQueue.tsx`, `WarningBanner.tsx`, `HelpSection.tsx`

**Severity:** Major
**Category:** Duplication / Maintainability

**Description:**
The codebase uses inline `style={{...}}` objects everywhere instead of CSS classes or a styling system. Many style patterns are repeated verbatim across files:

- Card styles: `border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '...'` — repeated ~15 times
- Button styles: primary and secondary button patterns repeated ~10 times
- Error text styles: `color: 'var(--color-error-text)', fontSize: '0.8rem'` — repeated ~8 times

**Before (repeated in at least 6 files):**
```typescript
style={{
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '0.75rem',
  background: 'var(--color-surface)',
}}
```

**Recommended Fix:**
Extract shared CSS classes to `index.css` and use `className` instead:

```css
/* index.css */
.card {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--color-surface);
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: var(--color-primary);
  color: var(--color-primary-text);
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
}

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  cursor: pointer;
}
```

Then in components:
```tsx
<div className="card">
  <button className="btn-primary">Save</button>
  <button className="btn-secondary">Cancel</button>
</div>
```

**Reasoning:**
Reduces bundle size (inline styles create new objects on every render), improves maintainability (change one class vs. 15 inline blocks), enables browser caching of CSS, and aligns with the existing CSS custom properties approach already in `index.css`.

---

### 5. Duplicated Repetition Detection Logic (Client/Server)

**File(s):** `client/src/modules/ReflectionModule/validation.ts:20`, `server/src/routes/validate.ts:19`

**Severity:** Major
**Category:** Duplication / Architecture

**Description:**
The `hasRepetition` function is implemented independently on both client and server with identical logic. This violates DRY and risks the two implementations drifting apart — a server validation could pass while the client rejects, or vice versa.

**Before (client — validation.ts:20):**
```typescript
export function hasRepetition(text: string, minRepetitions = 2, ngramSize = 3): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < ngramSize * minRepetitions) return false;
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - ngramSize; i++) {
    const ngram = words.slice(i, i + ngramSize).join(' ');
    const count = (ngrams.get(ngram) ?? 0) + 1;
    if (count >= minRepetitions) return true;
    ngrams.set(ngram, count);
  }
  return false;
}
```

**Before (server — validate.ts:19):**
```typescript
function hasRepetition(text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < NGRAM_SIZE * MIN_REPETITIONS) return false;
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - NGRAM_SIZE; i++) {
    const ngram = words.slice(i, i + NGRAM_SIZE).join(' ');
    const count = (ngrams.get(ngram) ?? 0) + 1;
    if (count >= MIN_REPETITIONS) return true;
    ngrams.set(ngram, count);
  }
  return false;
}
```

**Recommended Fix:**
Share the validation module between client and server. Since both use TypeScript, create a `shared/` workspace package or a `shared/validation.ts` that's imported by both:

```typescript
// shared/validation.ts
export const MIN_WORDS = 25;
export const NGRAM_SIZE = 3;
export const MIN_REPETITIONS = 2;

export function countWords(text: string): number { /* ... */ }
export function hasRepetition(text: string): boolean { /* ... */ }
```

**Reasoning:**
Dual-layer validation is a good pattern, but both layers must use the same code. A shared package eliminates drift.

---

### 6. Redundant Data Fetching — Same Endpoint Called by Multiple Components

**File(s):** `client/src/modules/DraftEditorModule/index.tsx:115`, `client/src/modules/StatsPanel/index.tsx:56`, `client/src/modules/ReflectionModule/index.tsx:44`

**Severity:** Major
**Category:** Architecture / Performance

**Description:**
Three separate components independently fetch the same interaction logs endpoint (`/interactions?assignment_id=...&scoped=true`) and the same assignment data. There is no shared data layer or cache — the same HTTP requests fire redundantly on each wizard step.

**Before (DraftEditorModule:112-116):**
```typescript
const [assignment, logs] = await Promise.all([
  api.get<Assignment>(`/assignments/${assignmentId}`),
  api.get<InteractionLog[]>(`/interactions?assignment_id=${assignmentId}&scoped=true`),
]);
```

**Before (StatsPanel:56-58):**
```typescript
const data = await api.get<InteractionLog[]>(
  `/interactions?assignment_id=${assignmentId}&scoped=true`,
);
```

**Before (ReflectionModule:43-46):**
```typescript
const [assignment, logs] = await Promise.all([
  api.get<{ title: string }>(`/assignments/${assignmentId}`),
  api.get<InteractionLog[]>(`/interactions?assignment_id=${assignmentId}&scoped=true`),
]);
```

**Recommended Fix:**
Create a custom hook or context-based data provider that fetches once and shares:

```typescript
// hooks/useAssignmentData.ts
export function useAssignmentData(assignmentId: string) {
  const [data, setData] = useState<{
    assignment: Assignment;
    logs: InteractionLog[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      api.get<Assignment>(`/assignments/${assignmentId}`),
      api.get<InteractionLog[]>(
        `/interactions?assignment_id=${assignmentId}&scoped=true`
      ),
    ]).then(([assignment, logs]) => setData({ assignment, logs }));
  }, [assignmentId]);

  return data;
}
```

Or lift the data into `App.tsx` (which already lifts `entries`) and pass it down.

**Reasoning:**
Eliminates redundant network requests, improves page load time, and creates a single source of truth for assignment + logs data.

---

### 7. Long Component — `ManualUsageModule` (401 lines)

**File(s):** `client/src/modules/ManualUsageModule/index.tsx`

**Severity:** Major
**Category:** Structural / Complexity

**Description:**
At 401 lines, this is the longest component in the codebase. It mixes UI rendering (form, entry list, buttons), business logic (form validation, API calls, event emission), and helper components (`FieldWrapper`, `FieldError`, `inputStyle`). The single file handles list state, form state, submission, deletion, and display.

**Recommended Fix:**
Extract into focused sub-components:

```
ManualUsageModule/
  index.tsx          — orchestrator (state, API calls) ~80 lines
  ManualEntryList.tsx — renders the list of entries ~60 lines
  ManualEntryForm.tsx — the form with react-hook-form ~150 lines
  FormFields.tsx     — FieldWrapper, FieldError, inputStyle ~40 lines
```

**Reasoning:**
Improves testability (form can be tested independently), readability, and makes it easier to modify one concern without affecting others.

---

### 8. Long Component — `DraftEditorModule` (339 lines)

**File(s):** `client/src/modules/DraftEditorModule/index.tsx`

**Severity:** Minor
**Category:** Structural

**Description:**
339 lines with a reducer, data fetching, draft generation, regeneration, and rendering. The component juggles 8 state fields via `useReducer`, multiple API calls, and IntegrityMonitor wiring. While the reducer pattern is good, the file handles too many responsibilities.

**Recommended Fix:**
Extract the data-fetching and API-calling logic into a custom hook:

```typescript
// hooks/useDraftEditor.ts
export function useDraftEditor(assignmentId: string, studentId: string) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // ... load, handleGenerateDraft, handleRegenerateDraft
  return { state, dispatch, load, handleGenerateDraft, handleRegenerateDraft };
}
```

This leaves the component file focused on rendering (~150 lines).

**Reasoning:**
Separating business logic from UI is the standard React hooks pattern. The hook becomes independently testable without rendering.

---

### 9. Inline Styles on Every Render Create Unnecessary Object Allocations

**File(s):** All component files (especially `App.tsx:50-122`, `StatsPanel/index.tsx`, `ReviewAggregator/index.tsx`)

**Severity:** Minor
**Category:** Maintainability / Performance

**Description:**
Inline `style={{...}}` creates a new object on every render. While React is efficient at reconciling, complex components like `StatsPanel` and `ReviewAggregator` have deeply nested inline styles that create dozens of objects per render cycle.

In `App.tsx`, the grid layout style is computed conditionally on every render:

```typescript
style={{
  display: 'grid',
  gridTemplateColumns: currentStep === 'draft' ? '1fr 320px' : '1fr',
  flex: 1,
  gap: '2rem',
  // ... 4 more properties
}}
```

**Recommended Fix:**
For static styles, use CSS classes. For conditional styles, use CSS class toggling:

```css
/* index.css */
.layout-grid { display: grid; flex: 1; gap: 2rem; /* ... */ }
.layout-grid--with-sidebar { grid-template-columns: 1fr 320px; }
.layout-grid--full { grid-template-columns: 1fr; }
```

```tsx
<div className={`layout-grid ${
  currentStep === 'draft' ? 'layout-grid--with-sidebar' : 'layout-grid--full'
}`}>
```

**Reasoning:**
CSS classes are parsed once and cached by the browser. Inline styles bypass the browser's style engine optimization.

---

### 10. `confirm()` Used for Delete Confirmation (Browser-Dependent)

**File(s):** `client/src/modules/DraftEditorModule/EntryRow.tsx:84`

**Severity:** Minor
**Category:** Maintainability / UX

**Description:**
The native `window.confirm()` dialog is used for delete confirmation. This blocks the main thread, can't be styled, behaves inconsistently across browsers, is invisible to screen readers during display, and is untestable in unit tests.

**Before (EntryRow.tsx:84):**
```typescript
if (!confirm('Delete this entry? This action will be tracked as a potential underrepresentation (R-8).')) return;
```

**Recommended Fix:**
Use a confirmation state within the component:

```typescript
const [confirmDelete, setConfirmDelete] = useState(false);

// In render:
{confirmDelete ? (
  <div role="alertdialog" aria-label="Confirm deletion">
    <p>Delete this entry? This will be tracked as potential underrepresentation.</p>
    <button onClick={handleDelete}>Confirm Delete</button>
    <button onClick={() => setConfirmDelete(false)}>Cancel</button>
  </div>
) : (
  <button onClick={() => setConfirmDelete(true)}>Delete</button>
)}
```

**Reasoning:**
Accessible, testable, consistent across browsers, and styleable to match the application design.

---

### 11. Repeated `as` Type Casts for Database Rows (Server-Side)

**File(s):** `server/src/routes/declarations.ts:65-67`, `server/src/routes/interactions.ts:29`, `server/src/routes/assignments.ts:70`, `server/src/routes/regenerate.ts:19-21`

**Severity:** Minor
**Category:** Maintainability / Type Safety

**Description:**
Every database query result is cast with `as` — often with verbose inline type annotations. This pattern is repeated across all route files and provides no runtime safety (the cast could be wrong and nothing would catch it).

**Before (declarations.ts:65-67):**
```typescript
const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignment_id) as
  | { period_start: string; period_end: string }
  | undefined;
```

**Recommended Fix:**
Create typed query helper functions:

```typescript
// db/queries.ts
import { getDb } from './index.js';
import type { Assignment, Declaration } from '../types.js';

export function getAssignment(id: string): Assignment | undefined {
  return getDb()
    .prepare('SELECT * FROM assignments WHERE id = ?')
    .get(id) as Assignment | undefined;
}

export function getDeclaration(id: string): Declaration | undefined {
  return getDb()
    .prepare('SELECT * FROM declarations WHERE id = ?')
    .get(id) as Declaration | undefined;
}
```

Then in routes:
```typescript
const assignment = getAssignment(assignment_id);
```

**Reasoning:**
Centralizes the cast to one place per entity, reduces code noise in route handlers, and makes it easy to add runtime validation later (e.g., with zod).

---

### 12. Missing Error Handling in `ReviewAggregator` Data Load

**File(s):** `client/src/modules/ReviewAggregator/index.tsx:49-57`

**Severity:** Major
**Category:** Maintainability / Error Handling

**Description:**
The data fetch in `ReviewAggregator` uses `try/finally` without a `catch` block. If the API call fails, `loading` is set to `false` but `declarationData` remains `null`, showing a generic "Could not load declaration" message with no error detail. More importantly, the error is silently swallowed.

**Before (ReviewAggregator/index.tsx:49-57):**
```typescript
useEffect(() => {
  void (async () => {
    try {
      const data = await api.get<DeclarationFull>(`/declarations/${declarationId}`);
      setDeclarationData(data);
    } finally {
      setLoading(false);
    }
  })();
}, [declarationId]);
```

**Recommended Fix:**
```typescript
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  void (async () => {
    try {
      const data = await api.get<DeclarationFull>(`/declarations/${declarationId}`);
      setDeclarationData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load declaration');
    } finally {
      setLoading(false);
    }
  })();
}, [declarationId]);
```

And render the actual error:
```typescript
if (error) {
  return (
    <p role="alert" style={{ color: 'var(--color-error-text)' }}>
      Error: {error}
    </p>
  );
}
```

**Reasoning:**
Silent error swallowing makes debugging difficult. The user sees a vague message with no way to understand or report what went wrong.

---

### 13. Missing Error Handling in `StatsPanel` Data Load

**File(s):** `client/src/modules/StatsPanel/index.tsx:53-62`

**Severity:** Minor
**Category:** Maintainability / Error Handling

**Description:**
Same pattern as ReviewAggregator — `try/finally` with no `catch`. If the logs endpoint fails, the panel just shows stale/empty data with no indication of failure.

**Before (StatsPanel/index.tsx:53-62):**
```typescript
const loadLogs = useCallback(async () => {
  try {
    const data = await api.get<InteractionLog[]>(
      `/interactions?assignment_id=${assignmentId}&scoped=true`,
    );
    setLogs(data);
  } finally {
    setLoading(false);
  }
}, [assignmentId]);
```

**Recommended Fix:**
Add a `catch` block and render an error state, following the same pattern as finding #12.

**Reasoning:**
The StatsPanel showing zero stats when the API fails is misleading. Better to show an explicit error.

---

### 14. SQL Injection Risk — String Interpolation in SQL Query

**File(s):** `server/src/routes/interactions.ts:86-93`

**Severity:** Critical
**Category:** Security

**Description:**
The `margin` variable is interpolated directly into a SQL string using a template literal, bypassing parameterized queries. While the value is parsed with `parseInt`, the string interpolation pattern is dangerous and could allow SQL injection if the parsing were removed or modified.

**Before (interactions.ts:86-93):**
```typescript
const margin = parseInt(margin_days, 10);
const rows = db.prepare(`
  SELECT * FROM interaction_logs
  WHERE assignment_id IS NULL
    AND logged_at >= datetime(?, '-${margin} days')
    AND logged_at <= datetime(?, '+${margin} days')
`).all(assignment.period_start, assignment.period_end);
```

**Recommended Fix:**
Use a fully parameterized approach:

```typescript
const margin = parseInt(margin_days, 10);
if (isNaN(margin) || margin < 0 || margin > 365) {
  res.status(400).json({ error: 'margin_days must be between 0 and 365' });
  return;
}
const rows = db.prepare(`
  SELECT * FROM interaction_logs
  WHERE assignment_id IS NULL
    AND logged_at >= datetime(?, '-' || ? || ' days')
    AND logged_at <= datetime(?, '+' || ? || ' days')
`).all(assignment.period_start, margin, assignment.period_end, margin);
```

**Reasoning:**
Even with `parseInt` as a guardrail, direct string interpolation in SQL is a category of vulnerability that should never exist. Parameterized queries prevent any possibility of injection.

---

### 15. No-Op Event Bus Listeners in `StatsPanel`

**File(s):** `client/src/modules/StatsPanel/index.tsx:70-82`

**Severity:** Minor
**Category:** Dead Code

**Description:**
StatsPanel subscribes to four event bus events with a handler that does nothing. The comment confirms these subscriptions are unnecessary: "state is lifted via props — re-render is automatic".

**Before (StatsPanel/index.tsx:70-82):**
```typescript
useEffect(() => {
  const refresh = () => { /* state is lifted via props — re-render is automatic */ };
  eventBus.on('ENTRY_DELETED', refresh);
  eventBus.on('ENTRY_MODIFIED', refresh);
  eventBus.on('MANUAL_ENTRY_ADDED', refresh);
  eventBus.on('MANUAL_ENTRY_REMOVED', refresh);
  return () => {
    eventBus.off('ENTRY_DELETED', refresh);
    eventBus.off('ENTRY_MODIFIED', refresh);
    eventBus.off('MANUAL_ENTRY_ADDED', refresh);
    eventBus.off('MANUAL_ENTRY_REMOVED', refresh);
  };
}, []);
```

**Recommended Fix:**
Remove the entire `useEffect` block. Re-renders are driven by prop changes (`entries` and `manualEntryCount` come from props), so the event bus subscriptions are dead code.

**Reasoning:**
Dead code increases cognitive load and maintenance burden. Future developers may try to add logic to the handler, not realizing it's intentionally empty.

---

### 16. Hardcoded Demo Constants / No Auth Layer

**File(s):** `client/src/App.tsx:18-19`

**Severity:** Minor
**Category:** Architecture / Primitive Obsession

**Description:**
`DEMO_ASSIGNMENT_ID` and `DEMO_STUDENT_ID` are hardcoded strings. This is acknowledged with a TODO comment, but these magic strings are threaded throughout the app and there's no mechanism to change them.

**Before (App.tsx:18-19):**
```typescript
const DEMO_ASSIGNMENT_ID = 'assign-001';
const DEMO_STUDENT_ID = 'student-demo-001';
```

**Recommended Fix:**
At minimum, extract to an environment-based config:

```typescript
// config.ts
export const config = {
  assignmentId: import.meta.env.VITE_ASSIGNMENT_ID ?? 'assign-001',
  studentId: import.meta.env.VITE_STUDENT_ID ?? 'student-demo-001',
};
```

**Reasoning:**
Environment-based config is a low-effort improvement that makes the app configurable without code changes and removes magic strings from component code.

---

### 17. Conditional Rendering Repetition in `App.tsx`

**File(s):** `client/src/App.tsx:125-163`

**Severity:** Minor
**Category:** Duplication / Structural

**Description:**
The "Please generate a draft declaration first" fallback message is repeated three times for three different steps (reflection, manual, review) — identical JSX each time.

**Before (App.tsx:139-163):**
```typescript
{currentStep === 'reflection' && !declarationId && (
  <p style={{ color: 'var(--color-text-muted)' }}>
    Please generate a draft declaration first.
  </p>
)}
{currentStep === 'manual' && !declarationId && (
  <p style={{ color: 'var(--color-text-muted)' }}>
    Please generate a draft declaration first.
  </p>
)}
{currentStep === 'review' && !declarationId && (
  <p style={{ color: 'var(--color-text-muted)' }}>
    Please generate a draft declaration first.
  </p>
)}
```

**Recommended Fix:**
Consolidate with a step-based rendering approach:

```typescript
{currentStep === 'draft' && (
  <DraftEditorModule ... />
)}
{currentStep !== 'draft' && !declarationId && (
  <p style={{ color: 'var(--color-text-muted)' }}>
    Please generate a draft declaration first.
  </p>
)}
{currentStep === 'reflection' && declarationId && (
  <ReflectionModule ... />
)}
{currentStep === 'manual' && declarationId && (
  <ManualUsageModule ... />
)}
{currentStep === 'review' && declarationId && (
  <ReviewAggregator ... />
)}
```

**Reasoning:**
Reduces the fallback to a single instance, making it easier to change the message or styling.

---

### 18. Unused `assignmentId` Prop in `ManualUsageModule`

**File(s):** `client/src/modules/ManualUsageModule/index.tsx:25,44`

**Severity:** Minor
**Category:** Dead Code

**Description:**
The `assignmentId` prop is declared in the `Props` interface but never used in the component body. It's accepted as a parameter but destructured away.

**Before (ManualUsageModule/index.tsx:25-29, 44):**
```typescript
interface Props {
  assignmentId: string;   // declared
  declarationId: string;
  onCountChange?: (count: number) => void;
}

const ManualUsageModule: React.FC<Props> = ({ declarationId, onCountChange }) => {
  // assignmentId never used
```

**Recommended Fix:**
Remove `assignmentId` from Props if unused, or use it (e.g., in the `eventBus.emit` call where `assignmentId: ''` is currently hardcoded on line 103).

**Reasoning:**
Unused props confuse readers. If it's needed for the event emission, it should be wired up properly.

---

### 19. Hardcoded `assignmentId: ''` in Event Emissions

**File(s):** `client/src/modules/ManualUsageModule/index.tsx:103,117`, `client/src/modules/DraftEditorModule/EntryRow.tsx:94`

**Severity:** Minor
**Category:** Primitive Obsession / Incomplete Implementation

**Description:**
Several event bus emissions include `assignmentId: ''` with comments like "filled by context in a real implementation". These empty strings are technically incorrect — consumers that check `assignmentId` will get empty data.

**Before (ManualUsageModule/index.tsx:101-105):**
```typescript
eventBus.emit('MANUAL_ENTRY_ADDED', {
  entryId,
  assignmentId: '',  // filled by context in a real implementation
  toolName: data.tool_name,
});
```

**Recommended Fix:**
Thread the `assignmentId` prop through properly (it's already available in the parent but not destructured in ManualUsageModule):

```typescript
eventBus.emit('MANUAL_ENTRY_ADDED', {
  entryId,
  assignmentId,
  toolName: data.tool_name,
});
```

**Reasoning:**
Empty strings are incorrect data. Since `assignmentId` is already passed as a prop, it should be used.

---

### 20. `eslint-disable` Comments Suppressing Hook Dependency Warnings

**File(s):** `client/src/modules/IntegrityMonitor/index.ts:191`, `client/src/modules/ReviewAggregator/index.tsx:71`

**Severity:** Minor
**Category:** Maintainability

**Description:**
Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress dependency array warnings. In IntegrityMonitor, the dependency array intentionally omits several callbacks. In ReviewAggregator, the snapshot effect intentionally runs only once on mount.

**Before (IntegrityMonitor/index.ts:191-192):**
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [declarationId, totalLoggedCount]);
```

**Before (ReviewAggregator/index.tsx:71-72):**
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [declarationId]);
```

**Recommended Fix:**
For IntegrityMonitor, the missing deps (`checkCoverage`, `checkToolMentions`, etc.) are stable callbacks (wrapped in `useCallback`). Adding them to the array would be safe and remove the suppression. For ReviewAggregator, the `createSnapshot` on mount is intentional — a comment explaining why is preferable to the lint suppression, or restructure to call it on first render via a ref flag.

**Reasoning:**
Lint suppressions hide potential bugs. Making the dependency arrays exhaustive or adding explanatory comments prevents future developers from wondering whether the suppression masks a real issue.

---

### 21. Duplicate Type Definitions (`DeclarationEntry` in Two Forms)

**File(s):** `client/src/types/api.ts:24-35`, `client/src/events/types.ts:27-36`

**Severity:** Minor
**Category:** Duplication

**Description:**
`DeclarationEntry` is defined twice with different shapes — one in `types/api.ts` (snake_case, mirrors DB) and one in `events/types.ts` (camelCase, domain event format). While they represent different contexts, the overlap creates confusion about which to import.

**Recommended Fix:**
Make the event type reference the API type or use a mapped type to derive one from the other, with a clear naming distinction (e.g., `DeclarationEntryDTO` vs `DeclarationEntryEvent`).

**Reasoning:**
Two types named `DeclarationEntry` in different files create import confusion and risk importing the wrong one.

---

### 22. Awkward Forced Type Assertion in Draft Generation

**File(s):** `client/src/modules/DraftEditorModule/index.tsx:164-165`

**Severity:** Minor
**Category:** Maintainability / Type Safety

**Description:**
A double assertion (`as unknown as`) is used to unwrap the API response, suggesting a mismatch between what the API returns and what the code expects.

**Before (DraftEditorModule/index.tsx:164-165):**
```typescript
const declaration = await api.get<Declaration>(`/declarations/${declarationId}`)
  .then((full) => (full as unknown as { declaration: Declaration }).declaration);
```

**Recommended Fix:**
Type the `api.get` call to match the actual response shape:

```typescript
const { declaration } = await api.get<{ declaration: Declaration }>(
  `/declarations/${declarationId}`,
);
```

**Reasoning:**
`as unknown as` is a code smell — it means the generic type parameter is wrong. Fixing the generic eliminates the unsafe double cast.

---

## Step 5: Summary Report

| # | Code Smell | File(s) | Severity | Category |
|---|-----------|---------|----------|----------|
| 1 | Duplicated `countWords` function | ManualUsageModule, validation.ts, manualEntries.ts, validate.ts | Major | Duplication |
| 2 | Duplicated warning condition labels | WarningBanner.tsx, ReviewAggregator | Minor | Duplication |
| 3 | Duplicated `COVERAGE_THRESHOLD` constant | IntegrityMonitor, StatsPanel | Minor | Duplication |
| 4 | Pervasive inline style objects | All components (~15 files) | Major | Duplication / Maintainability |
| 5 | Duplicated `hasRepetition` logic (client/server) | validation.ts, validate.ts | Major | Duplication / Architecture |
| 6 | Redundant data fetching (same endpoints x3) | DraftEditor, StatsPanel, ReflectionModule | Major | Architecture / Performance |
| 7 | Long component (401 lines) | ManualUsageModule | Major | Structural |
| 8 | Long component (339 lines) | DraftEditorModule | Minor | Structural |
| 9 | Inline styles — unnecessary object allocation | All component files | Minor | Maintainability / Performance |
| 10 | `confirm()` for delete (blocking, untestable) | EntryRow.tsx | Minor | Maintainability / UX |
| 11 | Repeated `as` type casts for DB rows | All server route files | Minor | Maintainability |
| 12 | Missing error handling (silent swallow) | ReviewAggregator | Major | Error Handling |
| 13 | Missing error handling (silent swallow) | StatsPanel | Minor | Error Handling |
| 14 | SQL string interpolation | interactions.ts (nearby route) | Critical | Security |
| 15 | No-op event bus listeners | StatsPanel | Minor | Dead Code |
| 16 | Hardcoded demo constants | App.tsx | Minor | Architecture |
| 17 | Repeated fallback message JSX | App.tsx | Minor | Duplication |
| 18 | Unused `assignmentId` prop | ManualUsageModule | Minor | Dead Code |
| 19 | Hardcoded `assignmentId: ''` in events | ManualUsageModule, EntryRow | Minor | Incomplete Implementation |
| 20 | `eslint-disable` for hook deps | IntegrityMonitor, ReviewAggregator | Minor | Maintainability |
| 21 | Duplicate `DeclarationEntry` type definitions | types/api.ts, events/types.ts | Minor | Duplication |
| 22 | Double type assertion (`as unknown as`) | DraftEditorModule | Minor | Type Safety |

### Severity Breakdown

- **Critical:** 1 (SQL injection risk)
- **Major:** 6 (duplicated logic, missing error handling, inline styles, long components, redundant fetching)
- **Minor:** 15 (dead code, naming, small duplication, type safety)

### Top 5 Recommended Priorities

1. **Fix the SQL interpolation** (#14, Critical — security vulnerability)
2. **Extract shared validation logic** into a shared package (#1, #5 — client+server DRY)
3. **Extract CSS classes** from inline styles (#4, #9 — biggest maintainability win)
4. **Add proper error handling** in ReviewAggregator and StatsPanel (#12, #13)
5. **Create a shared data-fetching hook** to eliminate redundant API calls (#6)

---

## AI-Assisted Review Documentation

### Prompt & Response Log

#### Prompt [1]:
> Understand your role and establish a plan for the code review.

#### AI Response Summary:
Established the review scope, identified the 5-step process from CLAUDE.md, and created a batched file-reading plan prioritizing the largest/most complex files first.

#### Prompt [2]:
> Proceed with the review.

#### AI Response Summary:
Read all ~45 significant source files across 4 parallel batches. Performed file-by-file analysis evaluating responsibility, size, complexity, dependencies, and error handling. Identified 22 code smells across all severity levels and categories, with before/after code examples for each.

#### Suggestions Identified:
1. Extract duplicated `countWords` into shared utility
2. Consolidate warning condition label maps
3. Share `COVERAGE_THRESHOLD` constant
4. Replace inline styles with CSS classes
5. Share `hasRepetition` logic between client/server
6. Create shared data-fetching hook
7. Decompose ManualUsageModule (401 lines)
8. Extract DraftEditorModule business logic into hook
9. Move static inline styles to CSS
10. Replace `confirm()` with accessible dialog
11. Create typed DB query helpers
12. Add error handling in ReviewAggregator
13. Add error handling in StatsPanel
14. Fix SQL string interpolation vulnerability
15. Remove no-op event bus listeners
16. Extract demo constants to config
17. Consolidate repeated fallback JSX
18. Remove or use unused `assignmentId` prop
19. Wire up proper `assignmentId` in event emissions
20. Fix or justify eslint-disable comments
21. Disambiguate duplicate `DeclarationEntry` types
22. Fix double type assertion
