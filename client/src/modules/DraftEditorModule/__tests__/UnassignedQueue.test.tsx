// Tests for UnassignedQueue — R-12
// Verifies user-facing behavior: unassigned interactions shown, student must resolve,
// no silent attribution.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import UnassignedQueue from '../UnassignedQueue';
import type { InteractionLog } from '../../../types/api';

vi.mock('../../../hooks/useApi', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../../events/eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { api } from '../../../hooks/useApi';

const mockUnassigned: InteractionLog[] = [
  {
    id: 'log-007',
    assignment_id: null,
    tool_name: 'ChatGPT',
    category: 'explanation',
    description: 'Used ChatGPT to understand gradient descent.',
    logged_at: '2025-11-12T10:00:00Z',
    origin_tag: 'unassigned',
  },
];

const mockAssignments = [
  { id: 'assign-001', title: 'Mandatory Assignment 1: Evolutionary Algorithms' },
  { id: 'assign-002', title: 'Mandatory Assignment 2: Neural Network Optimization' },
];

describe('UnassignedQueue — R-12', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R-12: renders unassigned interactions when present', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('unassigned')) return Promise.resolve(mockUnassigned);
      if (path.includes('assignments')) return Promise.resolve(mockAssignments);
      return Promise.resolve([]);
    });

    render(<UnassignedQueue />);
    await waitFor(() =>
      expect(screen.getByText(/1 Unassigned AI Interaction/i)).toBeInTheDocument(),
    );
  });

  it('R-12: shows "system will not guess" message', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('unassigned')) return Promise.resolve(mockUnassigned);
      if (path.includes('assignments')) return Promise.resolve(mockAssignments);
      return Promise.resolve([]);
    });

    render(<UnassignedQueue />);
    await waitFor(() =>
      expect(screen.getByText(/The system will not guess/i)).toBeInTheDocument(),
    );
  });

  it('R-12: shows assignment options for student to choose from', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('unassigned')) return Promise.resolve(mockUnassigned);
      if (path.includes('assignments')) return Promise.resolve(mockAssignments);
      return Promise.resolve([]);
    });

    render(<UnassignedQueue />);
    await waitFor(() =>
      expect(screen.getByText('Mandatory Assignment 1: Evolutionary Algorithms')).toBeInTheDocument(),
    );
  });

  it('R-12: renders nothing when no unassigned interactions exist', async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes('unassigned')) return Promise.resolve([]);
      if (path.includes('assignments')) return Promise.resolve(mockAssignments);
      return Promise.resolve([]);
    });

    const { container } = render(<UnassignedQueue />);
    await waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });
});
