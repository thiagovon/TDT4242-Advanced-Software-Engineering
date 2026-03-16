// Tests for ReviewAggregator submission flow — FR-28, FR-30
// IT-04: reflection → review cross-module flow
// IT-05: review with warnings present
// ST-03: submission blocked when reflection is invalid (server 422)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ReviewAggregator from '../../../modules/ReviewAggregator/index';
import { WarningsProvider, useWarningsDispatch } from '../../../contexts/WarningsContext';
import { ReflectionProvider, useSetReflection } from '../../../contexts/ReflectionContext';
import type { DeclarationFull, ManualUsageEntry } from '../../../types/api';
import type { IntegrityWarning } from '../../../events/types';

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

vi.mock('../../../services/VersionHistoryService', () => ({
  createSnapshot: vi.fn().mockResolvedValue('snap-001'),
  useVersionHistoryService: vi.fn(),
}));

import { api } from '../../../hooks/useApi';

const mockFullDeclaration: DeclarationFull = {
  declaration: {
    id: 'decl-001',
    assignment_id: 'assign-001',
    student_id: 'student-001',
    status: 'draft',
    time_period_locked_at: '2025-10-20T00:00:00Z',
    submitted_at: null,
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z',
  },
  entries: [
    {
      id: 'entry-001', declaration_id: 'decl-001', interaction_log_id: 'log-001',
      field_name: 'usage_summary',
      content: 'ChatGPT was used for explanation: crossover operators.',
      origin: 'auto-generated', previous_content: null, diff_delta: null,
      created_at: '', updated_at: '',
    },
    {
      id: 'entry-002', declaration_id: 'decl-001', interaction_log_id: 'log-002',
      field_name: 'usage_summary',
      content: 'GitHub Copilot was used for code generation: tournament selection.',
      origin: 'auto-generated-modified', previous_content: 'original content', diff_delta: -10,
      created_at: '', updated_at: '',
    },
    {
      id: 'entry-003', declaration_id: 'decl-001', interaction_log_id: 'log-003',
      field_name: 'usage_summary',
      content: 'ChatGPT was used for debugging: fitness function debugging.',
      origin: 'auto-generated', previous_content: null, diff_delta: null,
      created_at: '', updated_at: '',
    },
  ],
  manualEntries: [
    {
      id: 'manual-001', declaration_id: 'decl-001', tool_name: 'Claude',
      date_range: 'Oct 20 - Oct 30', description: 'Used Claude on phone for quick questions about algorithm complexity and optimization strategies for the GA.',
      reason: 'external_device', reason_other: null, created_at: '',
    } as ManualUsageEntry,
  ],
  reflection: {
    id: 'ref-001', declaration_id: 'decl-001',
    prompt1: 'AI significantly influenced my learning by providing immediate feedback on my code and helping me understand complex algorithmic concepts more quickly than reading textbooks alone.',
    prompt2: 'Without AI I would have spent more time reading documentation and debugging manually but I might have developed a deeper understanding through the struggle of figuring things out independently.',
    is_valid: 1, word_count_p1: 28, word_count_p2: 30, updated_at: '',
  },
};

// Helper to inject warnings into context before rendering
function WarningInjector({ warnings }: { warnings: IntegrityWarning[] }) {
  const dispatch = useWarningsDispatch();
  React.useEffect(() => {
    for (const w of warnings) {
      dispatch({ type: 'ADD_WARNING', warning: w });
    }
  }, [dispatch, warnings]);
  return null;
}

// Helper to inject valid reflection state
function ReflectionInjector({ isValid }: { isValid: boolean }) {
  const setReflection = useSetReflection();
  React.useEffect(() => {
    setReflection({
      prompt1: 'dummy valid text',
      prompt2: 'dummy valid text',
      isValid,
      wordCountPrompt1: isValid ? 30 : 0,
      wordCountPrompt2: isValid ? 30 : 0,
    });
  }, [setReflection, isValid]);
  return null;
}

function renderWithProviders(
  ui: React.ReactElement,
  options?: { warnings?: IntegrityWarning[]; reflectionValid?: boolean },
) {
  const { warnings = [], reflectionValid = true } = options ?? {};
  return render(
    <WarningsProvider>
      <ReflectionProvider>
        <WarningInjector warnings={warnings} />
        <ReflectionInjector isValid={reflectionValid} />
        {ui}
      </ReflectionProvider>
    </WarningsProvider>,
  );
}

describe('FR-28: Review & Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockFullDeclaration);
    vi.mocked(api.post).mockResolvedValue({ submitted: true });
  });

  it('IT-04: renders reflection text in review preview', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => {
      expect(screen.getByText(/AI significantly influenced my learning/i)).toBeInTheDocument();
      expect(screen.getByText(/Without AI I would have spent more time/i)).toBeInTheDocument();
    });
  });

  it('IT-05: confirmation text includes warning acknowledgement when warnings exist', async () => {
    const coverageWarning: IntegrityWarning = {
      id: 'warn-coverage-decl-001',
      condition: 'coverage_low',
      message: 'Your declaration covers only 40% of logged interactions.',
      raisedAt: new Date().toISOString(),
    };

    renderWithProviders(
      <ReviewAggregator declarationId="decl-001" />,
      { warnings: [coverageWarning] },
    );

    await waitFor(() => {
      expect(screen.getByText(/1 active integrity warning/i)).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText(/I acknowledge the unresolved warnings/i),
    ).toBeInTheDocument();
  });

  it('IT-05: renders all 3 entries and 1 manual entry in review', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => {
      expect(screen.getByText(/crossover operators/)).toBeInTheDocument();
      expect(screen.getByText(/tournament selection/)).toBeInTheDocument();
      expect(screen.getByText(/fitness function debugging/)).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });
  });

  it('IT-05: submit is disabled before confirming checkbox', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => screen.getByText('Submit Declaration'));
    expect(screen.getByRole('button', { name: /Submit Declaration/i })).toBeDisabled();
  });

  it('IT-05: submit succeeds after checking confirmation', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => screen.getByLabelText(/I confirm this declaration/i));
    fireEvent.click(screen.getByLabelText(/I confirm this declaration/i));

    const submitBtn = screen.getByRole('button', { name: /Submit Declaration/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/declarations/decl-001/submit', {});
    });

    await waitFor(() => {
      expect(screen.getByText(/Declaration Submitted/i)).toBeInTheDocument();
    });
  });

  it('FR-28: shows "Reflection is not complete" warning when reflection is invalid', async () => {
    const invalidData = {
      ...mockFullDeclaration,
      reflection: { ...mockFullDeclaration.reflection!, is_valid: 0 },
    };
    vi.mocked(api.get).mockResolvedValue(invalidData);

    renderWithProviders(
      <ReviewAggregator declarationId="decl-001" />,
      { reflectionValid: false },
    );

    await waitFor(() => {
      expect(screen.getByText(/Reflection is not complete/i)).toBeInTheDocument();
    });
  });

  it('ST-03: confirmation checkbox is disabled when reflection is invalid', async () => {
    const invalidData = {
      ...mockFullDeclaration,
      reflection: { ...mockFullDeclaration.reflection!, is_valid: 0 },
    };
    vi.mocked(api.get).mockResolvedValue(invalidData);

    renderWithProviders(
      <ReviewAggregator declarationId="decl-001" />,
      { reflectionValid: false },
    );

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  it('ST-03: shows error message when server rejects submission', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Reflection is not valid'));

    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => screen.getByLabelText(/I confirm this declaration/i));
    fireEvent.click(screen.getByLabelText(/I confirm this declaration/i));
    fireEvent.click(screen.getByRole('button', { name: /Submit Declaration/i }));

    await waitFor(() => {
      expect(screen.getByText('Reflection is not valid')).toBeInTheDocument();
    });
  });

  it('FR-28: shows origin badges for all entries in review', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    await waitFor(() => {
      const autoBadges = screen.getAllByText('Auto-generated');
      expect(autoBadges.length).toBe(2);
      expect(screen.getByText('Auto-generated (edited)')).toBeInTheDocument();
      expect(screen.getByText('Manually added')).toBeInTheDocument();
    });
  });

  it('FR-28: shows loading state before declaration data loads', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);

    expect(screen.getByText('Loading review…')).toBeInTheDocument();
  });
});
