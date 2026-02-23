// Manual entries router — R-10
// POST /api/declarations/:id/manual-entries        — add manual entry
// DELETE /api/declarations/:id/manual-entries/:eid — remove manual entry

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

const router = Router({ mergeParams: true });

const VALID_REASONS = ['external_device', 'unintegrated_tool', 'before_logging', 'other'] as const;
const MANUAL_DESCRIPTION_MIN_WORDS = 15;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// POST /api/declarations/:id/manual-entries
router.post('/', (req, res) => {
  const db = getDb();
  const { tool_name, date_range, description, reason, reason_other } = req.body as {
    tool_name: string;
    date_range: string;
    description: string;
    reason: string;
    reason_other?: string;
  };

  // R-10: validate all required fields
  const errors: string[] = [];
  if (!tool_name?.trim()) errors.push('tool_name is required');
  if (!date_range?.trim()) errors.push('date_range is required');
  if (!description?.trim()) errors.push('description is required');
  else if (countWords(description) < MANUAL_DESCRIPTION_MIN_WORDS)
    errors.push(`description must be at least ${MANUAL_DESCRIPTION_MIN_WORDS} words`);
  if (!reason || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number]))
    errors.push(`reason must be one of: ${VALID_REASONS.join(', ')}`);
  if (reason === 'other' && !reason_other?.trim())
    errors.push('reason_other is required when reason is "other"');

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const declarationId = (req.params as { id: string }).id;
  const declaration = db.prepare('SELECT id FROM declarations WHERE id = ?').get(declarationId);
  if (!declaration) {
    res.status(404).json({ error: 'Declaration not found' });
    return;
  }

  const entryId = randomUUID();
  db.prepare(`
    INSERT INTO manual_usage_entries
      (id, declaration_id, tool_name, date_range, description, reason, reason_other)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(entryId, declarationId, tool_name, date_range, description, reason, reason_other ?? null);

  res.status(201).json({ entryId });
});

// DELETE /api/declarations/:id/manual-entries/:eid
router.delete('/:eid', (req, res) => {
  const db = getDb();
  const { id: declarationId, eid } = req.params as { id: string; eid: string };

  const entry = db
    .prepare('SELECT id FROM manual_usage_entries WHERE id = ? AND declaration_id = ?')
    .get(eid, declarationId);

  if (!entry) {
    res.status(404).json({ error: 'Manual entry not found' });
    return;
  }

  db.prepare('DELETE FROM manual_usage_entries WHERE id = ?').run(eid);
  res.json({ deleted: true });
});

export default router;
