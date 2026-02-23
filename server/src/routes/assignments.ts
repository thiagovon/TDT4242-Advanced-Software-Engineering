// Assignments router — R-11
// CRUD for assignments and their time periods.
// GET /api/assignments          — list all assignments
// GET /api/assignments/:id      — get one assignment
// POST /api/assignments         — create (instructor use)
// PATCH /api/assignments/:id    — update time period (triggers R-11 notification logic)

import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// GET /api/assignments
router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM assignments ORDER BY period_start').all();
  res.json(rows);
});

// GET /api/assignments/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }
  res.json(row);
});

// POST /api/assignments
router.post('/', (req, res) => {
  const { id, course_id, course_name, title, description, period_start, period_end } = req.body as {
    id: string;
    course_id: string;
    course_name: string;
    title: string;
    description?: string;
    period_start: string;
    period_end: string;
  };

  if (!id || !course_id || !course_name || !title || !period_start || !period_end) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO assignments (id, course_id, course_name, title, description, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, course_id, course_name, title, description ?? null, period_start, period_end);

  res.status(201).json({ id });
});

// PATCH /api/assignments/:id — update time period (R-11: notify affected students)
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { period_start, period_end, title, description } = req.body as {
    period_start?: string;
    period_end?: string;
    title?: string;
    description?: string;
  };

  // Check if any declarations are already in progress (R-11)
  const inProgress = db
    .prepare('SELECT COUNT(*) as cnt FROM declarations WHERE assignment_id = ? AND time_period_locked_at IS NOT NULL')
    .get(req.params.id) as { cnt: number };

  const fields: string[] = [];
  const values: unknown[] = [];
  if (period_start) { fields.push('period_start = ?'); values.push(period_start); }
  if (period_end)   { fields.push('period_end = ?');   values.push(period_end); }
  if (title)        { fields.push('title = ?');         values.push(title); }
  if (description)  { fields.push('description = ?');  values.push(description); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  res.json({
    updated: true,
    affectedDeclarationsInProgress: inProgress.cnt,
    // R-11: caller should notify students if affectedDeclarationsInProgress > 0
  });
});

export default router;
