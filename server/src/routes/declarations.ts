// Declarations router — R-1, R-4, R-9, R-11
// GET  /api/declarations/:id                    — get declaration with entries
// POST /api/declarations                        — create declaration (R-9: snapshot initial_open)
// PATCH /api/declarations/:id/entries/:entryId  — edit an entry (R-4: track diff)
// DELETE /api/declarations/:id/entries/:entryId — delete an entry (R-4, R-8(a))
// POST /api/declarations/:id/save               — explicit save (R-9: snapshot manual_save)
// POST /api/declarations/:id/submit             — final submit (R-9: snapshot submission)

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { createSnapshot } from './versionHistory.js';

const router = Router();

// GET /api/declarations/:id — fetch declaration with all entries and reflection
router.get('/:id', (req, res) => {
  const db = getDb();
  const declaration = db.prepare('SELECT * FROM declarations WHERE id = ?').get(req.params.id);
  if (!declaration) {
    res.status(404).json({ error: 'Declaration not found' });
    return;
  }
  const entries = db
    .prepare('SELECT * FROM declaration_entries WHERE declaration_id = ? ORDER BY created_at')
    .all(req.params.id);
  const manualEntries = db
    .prepare('SELECT * FROM manual_usage_entries WHERE declaration_id = ? ORDER BY created_at')
    .all(req.params.id);
  const reflection = db
    .prepare('SELECT * FROM reflections WHERE declaration_id = ?')
    .get(req.params.id);

  res.json({ declaration, entries, manualEntries, reflection: reflection ?? null });
});

// GET /api/declarations/by-assignment/:assignmentId
router.get('/by-assignment/:assignmentId', (req, res) => {
  const db = getDb();
  const declaration = db
    .prepare('SELECT * FROM declarations WHERE assignment_id = ?')
    .get(req.params.assignmentId);
  if (!declaration) {
    res.status(404).json({ error: 'No declaration for this assignment' });
    return;
  }
  res.redirect(`/api/declarations/${(declaration as { id: string }).id}`);
});

// POST /api/declarations — create a new declaration
// R-9(a): creates initial_open snapshot
// R-11: locks the time period
router.post('/', (req, res) => {
  const db = getDb();
  const { assignment_id, student_id } = req.body as {
    assignment_id: string;
    student_id: string;
  };

  if (!assignment_id || !student_id) {
    res.status(400).json({ error: 'assignment_id and student_id are required' });
    return;
  }

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignment_id) as
    | { period_start: string; period_end: string }
    | undefined;

  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  // Check if declaration already exists
  const existing = db
    .prepare('SELECT id FROM declarations WHERE assignment_id = ?')
    .get(assignment_id) as { id: string } | undefined;

  if (existing) {
    res.status(409).json({ error: 'Declaration already exists for this assignment', declarationId: existing.id });
    return;
  }

  const declarationId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO declarations (id, assignment_id, student_id, status, time_period_locked_at)
    VALUES (?, ?, ?, 'draft', ?)
  `).run(declarationId, assignment_id, student_id, now);

  // R-9(a): initial_open snapshot
  createSnapshot(db, declarationId, 'initial_open');

  res.status(201).json({ declarationId });
});

// POST /api/declarations/:id/entries — add an auto-generated entry (R-1)
router.post('/:id/entries', (req, res) => {
  const db = getDb();
  const { field_name, content, origin, interaction_log_id } = req.body as {
    field_name: string;
    content: string;
    origin: 'auto-generated' | 'auto-generated-modified' | 'manual';
    interaction_log_id?: string;
  };

  if (!field_name || !content || !origin) {
    res.status(400).json({ error: 'field_name, content, and origin are required' });
    return;
  }

  const entryId = randomUUID();
  db.prepare(`
    INSERT INTO declaration_entries
      (id, declaration_id, interaction_log_id, field_name, content, origin)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entryId, req.params.id, interaction_log_id ?? null, field_name, content, origin);

  res.status(201).json({ entryId });
});

// PATCH /api/declarations/:id/entries/:entryId — edit a field (R-4)
router.patch('/:id/entries/:entryId', (req, res) => {
  const db = getDb();
  const { content } = req.body as { content: string };

  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const entry = db
    .prepare('SELECT * FROM declaration_entries WHERE id = ? AND declaration_id = ?')
    .get(req.params.entryId, req.params.id) as
    | { content: string; origin: string; previous_content: string | null }
    | undefined;

  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  // R-1: update origin badge
  const newOrigin =
    entry.origin === 'auto-generated' || entry.origin === 'auto-generated-modified'
      ? 'auto-generated-modified'
      : 'manual';

  // R-4: preserve previous content on first edit only
  const previousContent = entry.previous_content ?? entry.content;
  const diffDelta = content.length - entry.content.length;

  db.prepare(`
    UPDATE declaration_entries
    SET content = ?, origin = ?, previous_content = ?, diff_delta = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(content, newOrigin, previousContent, diffDelta, req.params.entryId);

  res.json({ updated: true, newOrigin, diffDelta });
});

// DELETE /api/declarations/:id/entries/:entryId — delete an entry (R-4, R-8(a))
router.delete('/:id/entries/:entryId', (req, res) => {
  const db = getDb();
  const entry = db
    .prepare('SELECT * FROM declaration_entries WHERE id = ? AND declaration_id = ?')
    .get(req.params.entryId, req.params.id);

  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  db.prepare('DELETE FROM declaration_entries WHERE id = ?').run(req.params.entryId);
  // R-8(a): caller should check if this was auto-generated and raise a warning
  res.json({ deleted: true });
});

// PATCH /api/declarations/:id/reflection — update reflection (R-5)
router.patch('/:id/reflection', (req, res) => {
  const db = getDb();
  const { prompt1, prompt2, is_valid, word_count_p1, word_count_p2 } = req.body as {
    prompt1: string;
    prompt2: string;
    is_valid: boolean;
    word_count_p1: number;
    word_count_p2: number;
  };

  const existing = db
    .prepare('SELECT id FROM reflections WHERE declaration_id = ?')
    .get(req.params.id);

  if (existing) {
    db.prepare(`
      UPDATE reflections
      SET prompt1 = ?, prompt2 = ?, is_valid = ?, word_count_p1 = ?, word_count_p2 = ?,
          updated_at = datetime('now')
      WHERE declaration_id = ?
    `).run(prompt1, prompt2, is_valid ? 1 : 0, word_count_p1, word_count_p2, req.params.id);
  } else {
    db.prepare(`
      INSERT INTO reflections (id, declaration_id, prompt1, prompt2, is_valid, word_count_p1, word_count_p2)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), req.params.id, prompt1, prompt2, is_valid ? 1 : 0, word_count_p1, word_count_p2);
  }

  res.json({ updated: true });
});

// POST /api/declarations/:id/save — explicit draft save (R-9(d))
router.post('/:id/save', (req, res) => {
  const db = getDb();
  createSnapshot(db, req.params.id, 'manual_save');
  res.json({ saved: true });
});

// POST /api/declarations/:id/submit — final submission (R-9(c))
// R-5: server-side validation gate
router.post('/:id/submit', (req, res) => {
  const db = getDb();

  const declaration = db.prepare('SELECT * FROM declarations WHERE id = ?').get(req.params.id) as
    | { status: string; id: string }
    | undefined;

  if (!declaration) {
    res.status(404).json({ error: 'Declaration not found' });
    return;
  }

  // R-5: server-side reflection validation gate
  const reflection = db
    .prepare('SELECT * FROM reflections WHERE declaration_id = ?')
    .get(req.params.id) as { is_valid: number } | undefined;

  if (!reflection || !reflection.is_valid) {
    res.status(422).json({
      error: 'Reflection is required before submission.',
      code: 'REFLECTION_INVALID',
    });
    return;
  }

  db.prepare(`
    UPDATE declarations
    SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  // R-9(c): submission snapshot
  createSnapshot(db, req.params.id, 'submission');

  res.json({ submitted: true });
});

export default router;
