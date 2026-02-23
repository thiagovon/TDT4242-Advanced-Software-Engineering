// Seed data — 1 course, 2 overlapping assignments, ~15 AI interaction logs
// Designed to exercise R-11 (time-period scoping), R-12 (overlapping assignments),
// and the 60% discrepancy highlight in R-2.
//
// Assignment overlap: both assignments share the period 2025-11-10 to 2025-11-20,
// so interactions in that window need explicit student tagging (R-12).

import type Database from 'better-sqlite3';

export function runSeed(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM assignments').get() as { cnt: number };
  if (existing.cnt > 0) {
    console.log('Seed data already present — skipping.');
    return;
  }

  console.log('Seeding database...');

  // ─── Course ─────────────────────────────────────────────────────────────────
  // (course data is embedded in assignments; no separate courses table in schema)

  // ─── Assignments ─────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO assignments (id, course_id, course_name, title, description, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'assign-001',
    'course-inf3490',
    'INF3490 — Biologically Inspired Computing',
    'Mandatory Assignment 1: Evolutionary Algorithms',
    'Implement and compare three evolutionary algorithm variants on a benchmark function.',
    '2025-10-20T00:00:00Z',
    '2025-11-20T23:59:59Z',
  );

  db.prepare(`
    INSERT INTO assignments (id, course_id, course_name, title, description, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'assign-002',
    'course-inf3490',
    'INF3490 — Biologically Inspired Computing',
    'Mandatory Assignment 2: Neural Network Optimization',
    'Train and evaluate a neural network using backpropagation and evolutionary search.',
    '2025-11-10T00:00:00Z',   // R-11, R-12: overlaps with assign-001 (Nov 10–20)
    '2025-12-05T23:59:59Z',
  );

  // ─── AI Interaction Logs (~15 entries) ──────────────────────────────────────
  // Spread across both assignments and the overlap window.
  // 3 entries are 'unassigned' (in the overlap period) to trigger R-12.

  const interactions: Array<{
    id: string;
    assignment_id: string | null;
    tool_name: string;
    category: string;
    description: string;
    logged_at: string;
    origin_tag: string;
  }> = [
    // assign-001 — pre-overlap (unambiguously scoped)
    {
      id: 'log-001',
      assignment_id: 'assign-001',
      tool_name: 'ChatGPT',
      category: 'explanation',
      description: 'Asked ChatGPT to explain crossover operators in genetic algorithms.',
      logged_at: '2025-10-22T10:15:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-002',
      assignment_id: 'assign-001',
      tool_name: 'ChatGPT',
      category: 'code generation',
      description: 'Generated a Python implementation of tournament selection.',
      logged_at: '2025-10-25T14:30:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-003',
      assignment_id: 'assign-001',
      tool_name: 'GitHub Copilot',
      category: 'code generation',
      description: 'Copilot autocompleted the fitness evaluation loop.',
      logged_at: '2025-10-28T09:00:00Z',
      origin_tag: 'inferred',
    },
    {
      id: 'log-004',
      assignment_id: 'assign-001',
      tool_name: 'Claude',
      category: 'debugging',
      description: 'Debugged an off-by-one error in the mutation operator with Claude.',
      logged_at: '2025-11-02T16:45:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-005',
      assignment_id: 'assign-001',
      tool_name: 'ChatGPT',
      category: 'explanation',
      description: 'Asked ChatGPT to compare simulated annealing vs genetic algorithms.',
      logged_at: '2025-11-05T11:00:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-006',
      assignment_id: 'assign-001',
      tool_name: 'GitHub Copilot',
      category: 'code generation',
      description: 'Copilot assisted with writing the benchmark function evaluator.',
      logged_at: '2025-11-08T13:20:00Z',
      origin_tag: 'inferred',
    },

    // OVERLAP WINDOW (Nov 10–20): assign-001 and assign-002 both active
    // These 3 are 'unassigned' — student must resolve via R-12 queue
    {
      id: 'log-007',
      assignment_id: null,   // R-12: unassigned — in overlap window
      tool_name: 'ChatGPT',
      category: 'explanation',
      description: 'Used ChatGPT to understand the relationship between EA and gradient descent.',
      logged_at: '2025-11-12T10:00:00Z',
      origin_tag: 'unassigned',
    },
    {
      id: 'log-008',
      assignment_id: null,   // R-12: unassigned — in overlap window
      tool_name: 'Claude',
      category: 'writing assistance',
      description: 'Asked Claude to proofread the theoretical background section.',
      logged_at: '2025-11-15T15:30:00Z',
      origin_tag: 'unassigned',
    },
    {
      id: 'log-009',
      assignment_id: null,   // R-12: unassigned — in overlap window
      tool_name: 'GitHub Copilot',
      category: 'code generation',
      description: 'Copilot generated a skeleton for the neural network class.',
      logged_at: '2025-11-18T09:45:00Z',
      origin_tag: 'unassigned',
    },

    // assign-002 — post-overlap (unambiguously scoped)
    {
      id: 'log-010',
      assignment_id: 'assign-002',
      tool_name: 'ChatGPT',
      category: 'explanation',
      description: 'ChatGPT explained backpropagation with a step-by-step example.',
      logged_at: '2025-11-22T12:00:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-011',
      assignment_id: 'assign-002',
      tool_name: 'GitHub Copilot',
      category: 'code generation',
      description: 'Copilot autocompleted the forward-pass implementation.',
      logged_at: '2025-11-24T14:00:00Z',
      origin_tag: 'inferred',
    },
    {
      id: 'log-012',
      assignment_id: 'assign-002',
      tool_name: 'Claude',
      category: 'debugging',
      description: 'Claude helped identify a vanishing gradient issue in the hidden layers.',
      logged_at: '2025-11-26T16:00:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-013',
      assignment_id: 'assign-002',
      tool_name: 'ChatGPT',
      category: 'explanation',
      description: 'Used ChatGPT to understand adaptive learning rate methods (Adam, RMSProp).',
      logged_at: '2025-11-28T10:30:00Z',
      origin_tag: 'student_tagged',
    },
    {
      id: 'log-014',
      assignment_id: 'assign-002',
      tool_name: 'GitHub Copilot',
      category: 'code generation',
      description: 'Copilot wrote the training loop with early stopping.',
      logged_at: '2025-12-01T11:00:00Z',
      origin_tag: 'inferred',
    },
    {
      id: 'log-015',
      assignment_id: 'assign-002',
      tool_name: 'Claude',
      category: 'writing assistance',
      description: 'Claude reviewed and improved the experimental results section.',
      logged_at: '2025-12-03T09:00:00Z',
      origin_tag: 'student_tagged',
    },
  ];

  const insertInteraction = db.prepare(`
    INSERT INTO interaction_logs
      (id, assignment_id, tool_name, category, description, logged_at, origin_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of interactions) {
    insertInteraction.run(
      row.id,
      row.assignment_id,
      row.tool_name,
      row.category,
      row.description,
      row.logged_at,
      row.origin_tag,
    );
  }

  console.log(`Seeded: 2 assignments, ${interactions.length} interaction logs.`);
}
