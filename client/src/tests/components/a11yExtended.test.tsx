// Extended accessibility tests — NFR-48
// NFR-04: automated jest-axe audit on additional modules
// Tests that key rendered modules have no WCAG 2.1 AA violations

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock API for components that make API calls
vi.mock('../../hooks/useApi', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../events/eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('../../services/VersionHistoryService', () => ({
  createSnapshot: vi.fn().mockResolvedValue('snap-001'),
  useVersionHistoryService: vi.fn(),
}));

vi.mock('../../hooks/useGuidance', () => ({
  useGuidance: () => ({
    institution: 'NTNU',
    tooltips: {},
    hints: {},
    helpSection: {
      title: 'Help',
      sections: [{ heading: 'Section 1', body: 'Content here.' }],
    },
  }),
}));

describe('NFR-48: Extended Accessibility Audit', () => {
  // NFR-04: HelpSection modal (open state) passes axe
  it('NFR-04: HelpSection open modal has no accessibility violations', async () => {
    const { default: HelpSection } = await import('../../components/HelpSection');
    const { container } = render(<HelpSection />);

    // Open the modal
    const btn = container.querySelector('button')!;
    btn.click();

    await waitFor(() => {
      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // NFR-04: StatsPanel passes axe (loading state)
  it('NFR-04: StatsPanel loading state has no accessibility violations', async () => {
    const { default: StatsPanel } = await import('../../modules/StatsPanel/index');
    const { container } = render(
      <StatsPanel assignmentId="assign-001" entries={[]} manualEntryCount={0} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // NFR-04: ReviewAggregator loading state passes axe
  it('NFR-04: ReviewAggregator loading state has no accessibility violations', async () => {
    const { WarningsProvider } = await import('../../contexts/WarningsContext');
    const { ReflectionProvider } = await import('../../contexts/ReflectionContext');
    const { default: ReviewAggregator } = await import('../../modules/ReviewAggregator/index');

    // api.get returns a never-resolving promise to keep it in loading state
    const { api } = await import('../../hooks/useApi');
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <WarningsProvider>
        <ReflectionProvider>
          <ReviewAggregator declarationId="decl-001" />
        </ReflectionProvider>
      </WarningsProvider>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // NFR-04: EntryRow passes axe in view mode
  it('NFR-04: EntryRow view mode has no accessibility violations', async () => {
    const { default: EntryRow } = await import('../../modules/DraftEditorModule/EntryRow');

    const entry = {
      id: 'entry-001',
      declaration_id: 'decl-001',
      interaction_log_id: 'log-001',
      field_name: 'usage_summary',
      content: 'ChatGPT was used for explanation.',
      origin: 'auto-generated' as const,
      previous_content: null,
      diff_delta: null,
      created_at: '',
      updated_at: '',
    };

    const { container } = render(
      <EntryRow
        entry={entry}
        declarationId="decl-001"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // NFR-04: EntryRow passes axe in edit mode
  it('NFR-04: EntryRow edit mode has no accessibility violations', async () => {
    const { default: EntryRow } = await import('../../modules/DraftEditorModule/EntryRow');

    const entry = {
      id: 'entry-001',
      declaration_id: 'decl-001',
      interaction_log_id: 'log-001',
      field_name: 'usage_summary',
      content: 'ChatGPT was used for explanation.',
      origin: 'auto-generated' as const,
      previous_content: null,
      diff_delta: null,
      created_at: '',
      updated_at: '',
    };

    const { container } = render(
      <EntryRow
        entry={entry}
        declarationId="decl-001"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    // Click edit button
    const editBtn = container.querySelector('button')!;
    editBtn.click();

    await waitFor(() => {
      expect(container.querySelector('textarea')).not.toBeNull();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
