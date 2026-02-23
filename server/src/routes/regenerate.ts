// Regenerate draft route — R-13
// POST /api/declarations/:id/regenerate
// Merges new auto-generated entries alongside existing content.
// Preserves all manual edits and reflections.
// Creates pre_regeneration and post_regeneration snapshots (R-9, R-13).

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { createSnapshot } from './versionHistory.js';

const router = Router();

// POST /api/declarations/:id/regenerate
router.post('/:id/regenerate', (req, res) => {
  const db = getDb();
  const declarationId = req.params.id;

  const declaration = db.prepare('SELECT * FROM declarations WHERE id = ?').get(declarationId) as
    | { assignment_id: string; id: string }
    | undefined;

  if (!declaration) {
    res.status(404).json({ error: 'Declaration not found' });
    return;
  }

  // R-13 / R-9: snapshot before regeneration
  createSnapshot(db, declarationId, 'pre_regeneration');

  // Get the assignment time period for scoping (R-11)
  const assignment = db
    .prepare('SELECT period_start, period_end FROM assignments WHERE id = ?')
    .get(declaration.assignment_id) as { period_start: string; period_end: string } | undefined;

  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  // Get current auto-generated entries (to identify which are still "pure" auto-generated)
  const currentEntries = db
    .prepare(`
      SELECT * FROM declaration_entries
      WHERE declaration_id = ?
    `)
    .all(declarationId) as Array<{
    id: string;
    origin: string;
    interaction_log_id: string | null;
  }>;

  // Identify which interaction_log_ids are already represented
  const existingLogIds = new Set(
    currentEntries
      .filter((e) => e.interaction_log_id)
      .map((e) => e.interaction_log_id as string),
  );

  // Get current scoped logs
  const scopedLogs = db
    .prepare(`
      SELECT * FROM interaction_logs
      WHERE assignment_id = ?
        AND logged_at >= ?
        AND logged_at <= ?
    `)
    .all(declaration.assignment_id, assignment.period_start, assignment.period_end) as Array<{
    id: string;
    tool_name: string;
    category: string;
    description: string;
  }>;

  // R-13: only add entries for NEW logs not already in the declaration
  let addedCount = 0;
  for (const log of scopedLogs) {
    if (existingLogIds.has(log.id)) continue;
    db.prepare(`
      INSERT INTO declaration_entries
        (id, declaration_id, interaction_log_id, field_name, content, origin)
      VALUES (?, ?, ?, ?, ?, 'auto-generated')
    `).run(
      randomUUID(),
      declarationId,
      log.id,
      'usage_summary',
      `${log.tool_name} was used for ${log.category}: ${log.description}`,
    );
    addedCount++;
  }

  // Update declaration timestamp
  db.prepare("UPDATE declarations SET updated_at = datetime('now') WHERE id = ?").run(declarationId);

  // R-13 / R-9: snapshot after regeneration
  createSnapshot(db, declarationId, 'post_regeneration');

  res.json({
    regenerated: true,
    newEntriesAdded: addedCount,
    message: `Draft regenerated. ${addedCount} new entr${addedCount === 1 ? 'y' : 'ies'} added from newly available logs. Existing edits and reflections preserved.`,
  });
});

export default router;
