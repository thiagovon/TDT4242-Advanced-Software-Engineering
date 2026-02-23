// Version history router — R-9
// Append-only: rows are written here and NEVER mutated or deleted.
//
// GET /api/version-history/:declarationId — list snapshots (student read-only view)
// POST /api/version-history/:declarationId — internal snapshot creation (used by other routes)
//
// createSnapshot() is also exported for use by other routers (declarations, etc.)

import { Router } from 'express';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { getDb } from '../db/index.js';

const router = Router();

// ─── Internal helper — called by other routes ────────────────────────────────

type SnapshotTrigger =
  | 'initial_open'
  | 'review_step'
  | 'submission'
  | 'manual_save'
  | 'pre_regeneration'
  | 'post_regeneration';

/**
 * Creates an append-only version snapshot for a declaration.
 * R-9: captures full declaration state, entries with origin metadata, and active warnings.
 */
export function createSnapshot(
  db: Database.Database,
  declarationId: string,
  trigger: SnapshotTrigger,
  activeWarnings: unknown[] = [],
): string {
  const declaration = db.prepare('SELECT * FROM declarations WHERE id = ?').get(declarationId);
  const entries = db
    .prepare('SELECT * FROM declaration_entries WHERE declaration_id = ?')
    .all(declarationId);
  const manualEntries = db
    .prepare('SELECT * FROM manual_usage_entries WHERE declaration_id = ?')
    .all(declarationId);
  const reflection = db
    .prepare('SELECT * FROM reflections WHERE declaration_id = ?')
    .get(declarationId);

  const snapshotData = JSON.stringify({
    declaration,
    entries,
    manualEntries,
    reflection: reflection ?? null,
    snapshotMeta: {
      trigger,
      capturedAt: new Date().toISOString(),
    },
  });

  const snapshotId = randomUUID();
  // R-9: append-only INSERT — no UPDATE or DELETE on this table
  db.prepare(`
    INSERT INTO version_history (id, declaration_id, trigger_event, snapshot_data, active_warnings)
    VALUES (?, ?, ?, ?, ?)
  `).run(snapshotId, declarationId, trigger, snapshotData, JSON.stringify(activeWarnings));

  return snapshotId;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/version-history/:declarationId — read-only access for student (R-9)
router.get('/:declarationId', (req, res) => {
  const db = getDb();
  const snapshots = db
    .prepare(`
      SELECT id, declaration_id, trigger_event, active_warnings, created_at
      FROM version_history
      WHERE declaration_id = ?
      ORDER BY created_at ASC
    `)
    .all(req.params.declarationId);

  res.json(snapshots);
});

// GET /api/version-history/:declarationId/:snapshotId — full snapshot detail
router.get('/:declarationId/:snapshotId', (req, res) => {
  const db = getDb();
  const snapshot = db
    .prepare('SELECT * FROM version_history WHERE id = ? AND declaration_id = ?')
    .get(req.params.snapshotId, req.params.declarationId);

  if (!snapshot) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }

  res.json(snapshot);
});

// POST /api/version-history/:declarationId — create snapshot at review step (R-9(b))
router.post('/:declarationId', (req, res) => {
  const db = getDb();
  const { trigger, active_warnings } = req.body as {
    trigger: SnapshotTrigger;
    active_warnings?: unknown[];
  };

  if (!trigger) {
    res.status(400).json({ error: 'trigger is required' });
    return;
  }

  const snapshotId = createSnapshot(db, req.params.declarationId, trigger, active_warnings ?? []);
  res.status(201).json({ snapshotId });
});

export default router;
