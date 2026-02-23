// Tests for ReviewAggregator — R-3, R-9
// Verifies user-facing behavior: read-only preview, two-step confirmation,
// dynamic warning text, submit gate.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ReviewAggregator from '../index';
import { WarningsProvider } from '../../../contexts/WarningsContext';
import { ReflectionProvider } from '../../../contexts/ReflectionContext';
import type { DeclarationFull } from '../../../types/api';

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

const mockDeclarationFull: DeclarationFull = {
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
      id: 'entry-001',
      declaration_id: 'decl-001',
      interaction_log_id: 'log-001',
      field_name: 'usage_summary',
      content: 'ChatGPT was used for explanation.',
      origin: 'auto-generated',
      previous_content: null,
      diff_delta: null,
      created_at: '',
      updated_at: '',
    },
  ],
  manualEntries: [],
  reflection: {
    id: 'ref-001',
    declaration_id: 'decl-001',
    prompt1: 'AI significantly influenced my learning by providing immediate feedback on my code.',
    prompt2: 'Without AI I would have spent more time reading documentation and debugging manually.',
    is_valid: 1,
    word_count_p1: 15,
    word_count_p2: 15,
    updated_at: '',
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <WarningsProvider>
      <ReflectionProvider>{ui}</ReflectionProvider>
    </WarningsProvider>,
  );
}

describe('ReviewAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockDeclarationFull);
    vi.mocked(api.post).mockResolvedValue({ submitted: true });
  });

  it('R-3: shows read-only declaration entries', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() =>
      expect(screen.getByText('ChatGPT was used for explanation.')).toBeInTheDocument(),
    );
  });

  it('R-3: shows origin badge on entries', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() => expect(screen.getByText('Auto-generated')).toBeInTheDocument());
  });

  it('R-3: Submit button is disabled before checkbox is checked', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() => screen.getByText('Submit Declaration'));
    const btn = screen.getByRole('button', { name: /Submit Declaration/i });
    expect(btn).toBeDisabled();
  });

  it('R-3: Submit button is enabled after checking the confirmation checkbox', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() => screen.getByLabelText(/I confirm this declaration/i));
    fireEvent.click(screen.getByLabelText(/I confirm this declaration/i));
    const btn = screen.getByRole('button', { name: /Submit Declaration/i });
    expect(btn).not.toBeDisabled();
  });

  it('R-3: review step is NOT skippable — two actions required', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() => screen.getByText('Submit Declaration'));
    // Without checking checkbox, submit must remain disabled
    const btn = screen.getByRole('button', { name: /Submit Declaration/i });
    expect(btn).toBeDisabled();
  });

  it('R-3: shows reflection text in preview', async () => {
    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() =>
      expect(
        screen.getByText(/AI significantly influenced my learning/i),
      ).toBeInTheDocument(),
    );
  });

  it('R-3: shows warning about incomplete reflection when reflection invalid', async () => {
    const noReflectionData = {
      ...mockDeclarationFull,
      reflection: { ...mockDeclarationFull.reflection!, is_valid: 0 },
    };
    vi.mocked(api.get).mockResolvedValue(noReflectionData);

    renderWithProviders(<ReviewAggregator declarationId="decl-001" />);
    await waitFor(() =>
      expect(screen.getByText(/Reflection is not complete/i)).toBeInTheDocument(),
    );
  });
});
