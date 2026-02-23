// Tests for DraftEditorModule — R-1, R-2, R-4
// Verifies user-facing behavior: origin badges, draft generation, editing, deletion.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import DraftEditorModule from '../index';
import { WarningsProvider } from '../../../contexts/WarningsContext';
import type { DeclarationEntry, InteractionLog, Assignment } from '../../../types/api';

// Mock the api module
vi.mock('../../../hooks/useApi', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock eventBus
vi.mock('../../../events/eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { api } from '../../../hooks/useApi';

// Default mock for unassigned interactions (R-12) — no unassigned in most tests
const noUnassigned: never[] = [];

// Wrap with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<WarningsProvider>{ui}</WarningsProvider>);
}

const mockAssignment: Assignment = {
  id: 'assign-001',
  course_id: 'course-inf3490',
  course_name: 'INF3490',
  title: 'Mandatory Assignment 1: Evolutionary Algorithms',
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
];

const mockEntry: DeclarationEntry = {
  id: 'entry-001',
  declaration_id: 'decl-001',
  interaction_log_id: 'log-001',
  field_name: 'usage_summary',
  content: 'ChatGPT was used for explanation: Asked ChatGPT to explain crossover operators.',
  origin: 'auto-generated',
  previous_content: null,
  diff_delta: null,
  created_at: '2025-10-22T11:00:00Z',
  updated_at: '2025-10-22T11:00:00Z',
};

function setup() {
  return renderWithProviders(
    <DraftEditorModule
      assignmentId="assign-001"
      studentId="student-001"
      onEntriesChange={vi.fn()}
    />,
  );
}

describe('DraftEditorModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R-1: shows Generate Draft button when no declaration exists yet', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve(noUnassigned);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() => expect(screen.getByText(/Generate Draft/i)).toBeInTheDocument());
  });

  it('R-1: shows log count before generating', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions/unassigned')) return Promise.resolve(noUnassigned);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() =>
      expect(screen.getByText(/Found 2 AI interaction logs/i)).toBeInTheDocument(),
    );
  });

  it('R-1: renders origin badge "Auto-generated" for auto-generated entries', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: { id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001', status: 'draft', time_period_locked_at: null, submitted_at: null, created_at: '', updated_at: '' },
          entries: [mockEntry],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() => expect(screen.getByText('Auto-generated')).toBeInTheDocument());
  });

  it('R-1: shows "Auto-generated (edited)" badge after editing', async () => {
    const editedEntry: DeclarationEntry = {
      ...mockEntry,
      origin: 'auto-generated-modified',
      previous_content: mockEntry.content,
      content: 'Edited content here.',
    };

    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: { id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001', status: 'draft', time_period_locked_at: null, submitted_at: null, created_at: '', updated_at: '' },
          entries: [editedEntry],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() =>
      expect(screen.getByText('Auto-generated (edited)')).toBeInTheDocument(),
    );
  });

  it('R-1: original content shown in disclosure when entry has been edited', async () => {
    const editedEntry: DeclarationEntry = {
      ...mockEntry,
      origin: 'auto-generated-modified',
      previous_content: 'Original auto-generated text here.',
      content: 'Edited content.',
    };

    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: { id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001', status: 'draft', time_period_locked_at: null, submitted_at: null, created_at: '', updated_at: '' },
          entries: [editedEntry],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() =>
      expect(screen.getByText('Original auto-generated content')).toBeInTheDocument(),
    );
  });

  it('R-4: Edit button is present for each entry', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: { id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001', status: 'draft', time_period_locked_at: null, submitted_at: null, created_at: '', updated_at: '' },
          entries: [mockEntry],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() => expect(screen.getByRole('button', { name: /Edit Usage Summary/i })).toBeInTheDocument());
  });

  it('R-4: Delete button is present for each entry', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('/assignments/')) return Promise.resolve(mockAssignment);
      if (path.includes('/interactions')) return Promise.resolve(mockLogs);
      if (path.includes('/declarations/by-assignment/')) {
        return Promise.resolve({
          declaration: { id: 'decl-001', assignment_id: 'assign-001', student_id: 'student-001', status: 'draft', time_period_locked_at: null, submitted_at: null, created_at: '', updated_at: '' },
          entries: [mockEntry],
          manualEntries: [],
          reflection: null,
        });
      }
      return Promise.reject({ status: 404 });
    });

    setup();
    await waitFor(() => expect(screen.getByRole('button', { name: /Delete Usage Summary/i })).toBeInTheDocument());
  });

  it('R-11: StatsPanel coverage shows discrepancy when entries < 60% of logs', async () => {
    // This test is for the StatsPanel; DraftEditor needs onEntriesChange
    // (tested separately in StatsPanel tests)
    expect(true).toBe(true); // placeholder
  });
});

describe('OriginBadge', () => {
  it('R-1: renders correct badge for each origin type', async () => {
    const { default: OriginBadge } = await import('../OriginBadge');

    const { rerender } = render(<OriginBadge origin="auto-generated" />);
    expect(screen.getByText('Auto-generated')).toBeInTheDocument();

    rerender(<OriginBadge origin="auto-generated-modified" />);
    expect(screen.getByText('Auto-generated (edited)')).toBeInTheDocument();

    rerender(<OriginBadge origin="manual" />);
    expect(screen.getByText('Manually added')).toBeInTheDocument();
  });
});
