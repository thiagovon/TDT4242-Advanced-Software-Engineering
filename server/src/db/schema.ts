// SQLite schema — all tables for AI Guidebook
// Append-only constraint on version_history enforced at the application layer (R-9).
// Foreign keys are ON (pragma set in db/index.ts).

export const SCHEMA_SQL = `
-- ─── R-11: Assignments with instructor-defined time periods ───────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL,
  course_name   TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  period_start  TEXT NOT NULL,   -- ISO 8601 datetime (instructor-defined)
  period_end    TEXT NOT NULL,   -- ISO 8601 datetime (instructor-defined)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── R-11: AI interaction logs scoped to an assignment ───────────────────────
-- origin_tag tracks whether the interaction was explicitly tagged by the student
-- or inferred from context (R-12).
CREATE TABLE IF NOT EXISTS interaction_logs (
  id              TEXT PRIMARY KEY,
  assignment_id   TEXT,          -- NULL = unassigned (R-12)
  tool_name       TEXT NOT NULL, -- e.g. "ChatGPT", "GitHub Copilot", "Claude"
  category        TEXT NOT NULL, -- e.g. "code generation", "explanation", "debugging"
  description     TEXT NOT NULL,
  logged_at       TEXT NOT NULL, -- ISO 8601 — used for time-period scoping (R-11)
  origin_tag      TEXT NOT NULL DEFAULT 'inferred'
                    CHECK(origin_tag IN ('student_tagged', 'inferred', 'unassigned')),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

-- ─── R-1, R-4: Declarations per assignment per student ──────────────────────
-- time_period_locked_at captures when the period was locked (R-11).
CREATE TABLE IF NOT EXISTS declarations (
  id                      TEXT PRIMARY KEY,
  assignment_id           TEXT NOT NULL UNIQUE,  -- one declaration per assignment
  student_id              TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK(status IN ('draft', 'submitted')),
  time_period_locked_at   TEXT,                  -- R-11: set on first open
  submitted_at            TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

-- ─── R-1, R-4: Individual declaration entries with origin metadata ───────────
-- Each field in the declaration draft is a separate entry.
-- origin is the core metadata that must never be discarded (Dev Rule 3).
CREATE TABLE IF NOT EXISTS declaration_entries (
  id                    TEXT PRIMARY KEY,
  declaration_id        TEXT NOT NULL,
  interaction_log_id    TEXT,          -- non-null for auto-generated entries
  field_name            TEXT NOT NULL, -- e.g. "tool_description", "usage_summary"
  content               TEXT NOT NULL,
  origin                TEXT NOT NULL
                          CHECK(origin IN (
                            'auto-generated',
                            'auto-generated-modified',
                            'manual'
                          )),
  previous_content      TEXT,          -- R-4: preserved on first edit
  diff_delta            INTEGER,       -- R-4: character delta (negative = shortened)
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (declaration_id) REFERENCES declarations(id),
  FOREIGN KEY (interaction_log_id) REFERENCES interaction_logs(id)
);

-- ─── R-9: Append-only version history ────────────────────────────────────────
-- Rows are never UPDATEd or DELETEd — enforced by application layer.
-- snapshot_data is a JSON blob of the full declaration state at snapshot time.
CREATE TABLE IF NOT EXISTS version_history (
  id              TEXT PRIMARY KEY,
  declaration_id  TEXT NOT NULL,
  trigger_event   TEXT NOT NULL
                    CHECK(trigger_event IN (
                      'initial_open',
                      'review_step',
                      'submission',
                      'manual_save',
                      'pre_regeneration',
                      'post_regeneration'
                    )),
  snapshot_data   TEXT NOT NULL,   -- JSON: full declaration state + origin metadata + active warnings
  active_warnings TEXT NOT NULL DEFAULT '[]', -- JSON array of IntegrityWarning objects
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (declaration_id) REFERENCES declarations(id)
);

-- ─── R-10: Manual usage entries ──────────────────────────────────────────────
-- Separate table for entries declared manually by the student.
-- IntegrityMonitor treats these equivalently to auto-generated (R-10).
CREATE TABLE IF NOT EXISTS manual_usage_entries (
  id              TEXT PRIMARY KEY,
  declaration_id  TEXT NOT NULL,
  tool_name       TEXT NOT NULL,          -- R-10(a): required, free text
  date_range      TEXT NOT NULL,          -- R-10(b): approximate date or range
  description     TEXT NOT NULL,          -- R-10(c): ≥15 words
  reason          TEXT NOT NULL           -- R-10(d): predefined list value
                    CHECK(reason IN (
                      'external_device',
                      'unintegrated_tool',
                      'before_logging',
                      'other'
                    )),
  reason_other    TEXT,                   -- R-10(d): populated when reason = 'other'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (declaration_id) REFERENCES declarations(id)
);

-- ─── R-5: Reflections (stored separately for clarity) ────────────────────────
CREATE TABLE IF NOT EXISTS reflections (
  id              TEXT PRIMARY KEY,
  declaration_id  TEXT NOT NULL UNIQUE,
  prompt1         TEXT NOT NULL DEFAULT '',
  prompt2         TEXT NOT NULL DEFAULT '',
  is_valid        INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  word_count_p1   INTEGER NOT NULL DEFAULT 0,
  word_count_p2   INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (declaration_id) REFERENCES declarations(id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interaction_logs_assignment
  ON interaction_logs(assignment_id);

CREATE INDEX IF NOT EXISTS idx_interaction_logs_logged_at
  ON interaction_logs(logged_at);

CREATE INDEX IF NOT EXISTS idx_declaration_entries_declaration
  ON declaration_entries(declaration_id);

CREATE INDEX IF NOT EXISTS idx_version_history_declaration
  ON version_history(declaration_id);

CREATE INDEX IF NOT EXISTS idx_manual_usage_declaration
  ON manual_usage_entries(declaration_id);
`;
