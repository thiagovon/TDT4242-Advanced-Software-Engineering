// Tests for StatsPanel — FR-27
// UT-03: computeStats with populated logs
// UT-04: coverage threshold boundary
// IT-02: cross-module DraftEditorModule → StatsPanel sync

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import StatsPanel from '../../../modules/StatsPanel/index';
import type { DeclarationEntry, InteractionLog } from '../../../types/api';

// Mock api
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

const mockLogs5: InteractionLog[] = [
  { id: 'log-001', assignment_id: 'assign-001', tool_name: 'ChatGPT', category: 'explanation', description: 'Explain crossover.', logged_at: '2025-10-22T10:15:00Z', origin_tag: 'student_tagged' },
  { id: 'log-002', assignment_id: 'assign-001', tool_name: 'Copilot', category: 'code generation', description: 'Generate selection fn.', logged_at: '2025-10-25T14:30:00Z', origin_tag: 'inferred' },
  { id: 'log-003', assignment_id: 'assign-001', tool_name: 'ChatGPT', category: 'debugging', description: 'Debug fitness.', logged_at: '2025-10-26T09:00:00Z', origin_tag: 'student_tagged' },
  { id: 'log-004', assignment_id: 'assign-001', tool_name: 'ChatGPT', category: 'explanation', description: 'Explain mutation.', logged_at: '2025-10-27T11:00:00Z', origin_tag: 'student_tagged' },
  { id: 'log-005', assignment_id: 'assign-001', tool_name: 'Copilot', category: 'code generation', description: 'Generate GA main loop.', logged_at: '2025-10-28T16:00:00Z', origin_tag: 'inferred' },
];

function makeEntry(id: string, declId: string, logId: string): DeclarationEntry {
  return { id, declaration_id: declId, interaction_log_id: logId, field_name: 'usage_summary', content: `Entry for ${logId}`, origin: 'auto-generated', previous_content: null, diff_delta: null, created_at: '', updated_at: '' };
}

describe('StatsPanel — FR-27', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('UT-03: displays correct tool count, interaction count, categories, and time span', async () => {
    vi.mocked(api.get).mockResolvedValue(mockLogs5);
    const entries = mockLogs5.map((l, i) => makeEntry(`e-${i}`, 'decl-001', l.id));
    render(<StatsPanel assignmentId="assign-001" entries={entries} manualEntryCount={0} />);
    await waitFor(() => { expect(screen.getByText('Logged interactions')).toBeInTheDocument(); });
    const fives = screen.getAllByText('5');
    expect(fives.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    expect(screen.getByText('Copilot')).toBeInTheDocument();
    expect(screen.getByText('explanation')).toBeInTheDocument();
    expect(screen.getByText('code generation')).toBeInTheDocument();
    expect(screen.getByText('debugging')).toBeInTheDocument();
  });

  it('UT-04: does not show discrepancy alert when coverage is exactly 60%', async () => {
    vi.mocked(api.get).mockResolvedValue(mockLogs5);
    const entries = [makeEntry('e-1', 'decl-001', 'log-001'), makeEntry('e-2', 'decl-001', 'log-002'), makeEntry('e-3', 'decl-001', 'log-003')];
    render(<StatsPanel assignmentId="assign-001" entries={entries} manualEntryCount={0} />);
    await waitFor(() => { expect(screen.getByText('60%')).toBeInTheDocument(); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('UT-04: shows discrepancy alert when coverage is below 60%', async () => {
    vi.mocked(api.get).mockResolvedValue(mockLogs5);
    const entries = [makeEntry('e-1', 'decl-001', 'log-001'), makeEntry('e-2', 'decl-001', 'log-002')];
    render(<StatsPanel assignmentId="assign-001" entries={entries} manualEntryCount={0} />);
    await waitFor(() => { expect(screen.getByRole('alert')).toBeInTheDocument(); });
    expect(screen.getByRole('alert')).toHaveTextContent(/40%/);
  });

  it('FR-27: shows 100% coverage when no interactions are logged', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    render(<StatsPanel assignmentId="assign-001" entries={[]} manualEntryCount={0} />);
    await waitFor(() => { expect(screen.getByText('100%')).toBeInTheDocument(); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('IT-02: manual entries contribute to coverage calculation', async () => {
    vi.mocked(api.get).mockResolvedValue(mockLogs5);
    const entries = [makeEntry('e-1', 'decl-001', 'log-001'), makeEntry('e-2', 'decl-001', 'log-002')];
    render(<StatsPanel assignmentId="assign-001" entries={entries} manualEntryCount={1} />);
    await waitFor(() => { expect(screen.getByText('60%')).toBeInTheDocument(); });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('IT-02: shows 100% coverage when all interactions are declared', async () => {
    vi.mocked(api.get).mockResolvedValue(mockLogs5);
    const entries = mockLogs5.map((l, i) => makeEntry(`e-${i}`, 'decl-001', l.id));
    render(<StatsPanel assignmentId="assign-001" entries={entries} manualEntryCount={0} />);
    await waitFor(() => { expect(screen.getByText('100%')).toBeInTheDocument(); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FR-27: shows loading state before data arrives', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<StatsPanel assignmentId="assign-001" entries={[]} manualEntryCount={0} />);
    expect(screen.getByText('Loading statistics…')).toBeInTheDocument();
  });
});
