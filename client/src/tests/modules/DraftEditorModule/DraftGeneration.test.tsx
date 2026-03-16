// Tests for Draft Generation — FR-26
// UT-01: buildEntriesFromLog with populated logs
// UT-02: buildEntriesFromLog with empty logs
// IT-01: full draft generation flow via button click
// Edge: empty interaction log, disabled generate button

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import DraftEditorModule from '../../../modules/DraftEditorModule/index';
import { WarningsProvider } from '../../../contexts/WarningsContext';
import type { InteractionLog, Assignment } from '../../../types/api';

vi.mock('../../../hooks/useApi', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../events/eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { api } from '../../../hooks/useApi';

const mockAssignment: Assignment = {
  id: 'assign-001',
  course_id: 'course-inf3490',
  course_name: 'INF3490',
  title: 'Mandatory Assignment 1',
  description: null,
  period_start: '2025-10-20T00:00:00Z',
  period_end: '2025-11-20T23:59:59Z',
  created_at: '2025-10-01T00:00:00Z',
};

const mockLogs: InteractionLog[] = [
  {
    id: 'log-001',
    assignment_id: 'assign-001',
    tool_name: 'ChatGPT',
    category: 'explanation',
    description: 'Asked ChatGPT to explain crossover operators.',
    logged_at: '2025-10-22T10:15:00Z',
    origin_tag: 'student_tagged',
  },
  {
    id: 'log-002',
    assignment_id: 'assign-001',
    tool_name: 'GitHub Copilot',
    category: 'code generation',
    description: 'Copilot generated tournament selection.',
    logged_at: '2025-10-25T14:30:00Z',
    origin_tag: 'inferred',
  },
  {
    id: 'log-003',
    assignment_id: 'assign-001',
    tool_name: 'ChatGPT',
    category: 'debugging',
    description: 'ChatGPT helped debug fitness function.',
    logged_at: '2025-10-26T09:00:00Z',
    origin_tag: 'student_tagged',
  },
  {
    id: 'log-004',
    assignment_id: 'assign-001',
    tool_name: 'Claude',
    category: 'explanation',
    description: 'Claude explained mutation strategies.',
    logged_at: '2025-10-27T11:00:00Z',
    origin_tag: 'student_tagged',
  },
];

function renderModule(props: Partial<React.ComponentProps<typeof DraftEditorModule>> = {}) {
  return render(
    <WarningsProvider>
      <DraftEditorModule
        assignmentId="assign-001"
        studentId="student-001"
        onEntriesChange={vi.fn()}
        {...props}
      />
    </WarningsProvider>,
  );
}

describe('FR-26: Draft Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UT-01: buildEntriesFromLog produces correct content format
  it('UT-01: generates entry content in format "tool was used for category: description"', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: {
            id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001',
            status: 'draft', time_period_locked_at: null, submitted_at: null,
            created_at: '', updated_at: '',
          },
          entries: [
            {
              id: 'entry-001', declaration_id: 'decl-001', interaction_log_id: 'log-001',
              field_name: 'usage_summary',
              content: 'ChatGPT was used for explanation: Asked ChatGPT to explain crossover operators.',
              origin: 'auto-generated', previous_content: null, diff_delta: null,
              created_at: '', updated_at: '',
            },
          ],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    renderModule();

    await waitFor(() => {
      expect(
        screen.getByText('ChatGPT was used for explanation: Asked ChatGPT to explain crossover operators.'),
      ).toBeInTheDocument();
    });
  });

  // UT-02: empty interaction log
  it('UT-02: shows "No AI interaction logs found" message when log is empty', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve([]); // empty logs
      return Promise.reject({ status: 404 });
    });

    renderModule();

    await waitFor(() => {
      expect(screen.getByText(/No AI interaction logs found/i)).toBeInTheDocument();
    });
  });

  // UT-02 branch: Generate Draft button is disabled when no logs
  it('UT-02: Generate Draft button is disabled when interaction log is empty', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve([]);
      return Promise.reject({ status: 404 });
    });

    renderModule();

    await waitFor(() => {
      const btn = screen.getByText('Generate Draft');
      expect(btn).toBeDisabled();
    });
  });

  // IT-01: clicking Generate Draft triggers POST and renders entries
  it('IT-01: clicking Generate Draft creates declaration and entry rows', async () => {
    let postCallCount = 0;
    const mockDeclaration = {
      id: 'decl-new', assignment_id: 'assign-001', student_id: 'student-001',
      status: 'draft', time_period_locked_at: null, submitted_at: null,
      created_at: '', updated_at: '',
    };

    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) return Promise.reject({ status: 404 });
      if (path.includes('/declarations/')) {
        return Promise.resolve({
          declaration: mockDeclaration,
          entries: [],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    vi.mocked(api.post).mockImplementation(() => {
      postCallCount++;
      if (postCallCount === 1) {
        return Promise.resolve({ declarationId: 'decl-new' });
      }
      return Promise.resolve({ entryId: `entry-${postCallCount}` });
    });

    renderModule();

    await waitFor(() => {
      expect(screen.getByText(/Found 4 AI interaction logs/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Generate Draft'));

    await waitFor(() => {
      // POST for declaration creation + 4 entries = 5 total POSTs
      expect(postCallCount).toBe(5);
    });
  });

  // IT-01 branch: verify entries have auto-generated origin after generation
  it('IT-01: all generated entries have auto-generated origin', async () => {
    let postCallCount = 0;
    const mockDeclaration = {
      id: 'decl-new', assignment_id: 'assign-001', student_id: 'student-001',
      status: 'draft', time_period_locked_at: null, submitted_at: null,
      created_at: '', updated_at: '',
    };

    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) return Promise.reject({ status: 404 });
      if (path.includes('/declarations/')) {
        return Promise.resolve({
          declaration: mockDeclaration,
          entries: [],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    vi.mocked(api.post).mockImplementation(() => {
      postCallCount++;
      if (postCallCount === 1) return Promise.resolve({ declarationId: 'decl-new' });
      return Promise.resolve({ entryId: `entry-${postCallCount}` });
    });

    renderModule();

    await waitFor(() => screen.getByText('Generate Draft'));
    fireEvent.click(screen.getByText('Generate Draft'));

    await waitFor(() => {
      const badges = screen.getAllByText('Auto-generated');
      expect(badges.length).toBe(4); // one per log entry
    });
  });

  // FR-26: shows correct log count
  it('FR-26: displays the correct number of found logs', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve([]);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      return Promise.reject({ status: 404 });
    });

    renderModule();

    await waitFor(() => {
      expect(screen.getByText(/Found 4 AI interaction log/i)).toBeInTheDocument();
    });
  });
});
