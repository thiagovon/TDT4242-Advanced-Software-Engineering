// Interactions router — R-11, R-12
// AI interaction logs scoped to assignments.
// GET /api/interactions?assignment_id=&scoped=true  — time-period-scoped logs (R-11)
// GET /api/interactions/unassigned                  — R-12 queue
// POST /api/interactions/:id/assign                 — resolve an unassigned interaction (R-12)

import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// GET /api/interactions?assignment_id=&scoped=true
// scoped=true enforces the assignment's time period window (R-11)
router.get('/', (req, res) => {
  const db = getDb();
  const { assignment_id, scoped } = req.query as { assignment_id?: string; scoped?: string };

  if (!assignment_id) {
    // Return all logs (admin use)
    const rows = db.prepare('SELECT * FROM interaction_logs ORDER BY logged_at').all();
    res.json(rows);
    return;
  }

  if (scoped === 'true') {
    // R-11: only include logs within the assignment's time period
    const assignment = db
      .prepare('SELECT period_start, period_end FROM assignments WHERE id = ?')
      .get(assignment_id) as { period_start: string; period_end: string } | undefined;

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const rows = db.prepare(`
      SELECT * FROM interaction_logs
      WHERE assignment_id = ?
        AND logged_at >= ?
        AND logged_at <= ?
      ORDER BY logged_at
    `).all(assignment_id, assignment.period_start, assignment.period_end);

    res.json(rows);
  } else {
    const rows = db
      .prepare('SELECT * FROM interaction_logs WHERE assignment_id = ? ORDER BY logged_at')
      .all(assignment_id);
    res.json(rows);
  }
});

// GET /api/interactions/unassigned — R-12: interactions that need student resolution
router.get('/unassigned', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM interaction_logs WHERE assignment_id IS NULL AND origin_tag = 'unassigned' ORDER BY logged_at")
    .all();
  res.json(rows);
});

// GET /api/interactions/nearby?assignment_id=&margin_days=7
// R-11: interactions just outside the assignment period (informational)
router.get('/nearby', (req, res) => {
  const db = getDb();
  const { assignment_id, margin_days = '7' } = req.query as {
    assignment_id?: string;
    margin_days?: string;
  };

  if (!assignment_id) {
    res.status(400).json({ error: 'assignment_id required' });
    return;
  }

  const assignment = db
    .prepare('SELECT period_start, period_end FROM assignments WHERE id = ?')
    .get(assignment_id) as { period_start: string; period_end: string } | undefined;

  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  // SQLite datetime arithmetic: expand window by margin_days on each side
  const margin = parseInt(margin_days, 10);
  const rows = db.prepare(`
    SELECT * FROM interaction_logs
    WHERE assignment_id IS NULL
      AND logged_at >= datetime(?, '-${margin} days')
      AND logged_at <= datetime(?, '+${margin} days')
    ORDER BY logged_at
  `).all(assignment.period_start, assignment.period_end);

  res.json(rows);
});

// POST /api/interactions/:id/assign — R-12: student assigns an interaction to an assignment
router.post('/:id/assign', (req, res) => {
  const db = getDb();
  const { assignment_id } = req.body as { assignment_id: string };

  if (!assignment_id) {
    res.status(400).json({ error: 'assignment_id required' });
    return;
  }

  const interaction = db
    .prepare('SELECT * FROM interaction_logs WHERE id = ?')
    .get(req.params.id);

  if (!interaction) {
    res.status(404).json({ error: 'Interaction not found' });
    return;
  }

  db.prepare(`
    UPDATE interaction_logs
    SET assignment_id = ?, origin_tag = 'student_tagged'
    WHERE id = ?
  `).run(assignment_id, req.params.id);

  res.json({ assigned: true, interactionId: req.params.id, assignmentId: assignment_id });
});

export default router;
