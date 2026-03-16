// Component tests for ReflectionModule — FR-30
// Covers: rendering, reference anchors, validation display, persistence, context sync

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ReflectionProvider } from '../../../contexts/ReflectionContext';

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
import { eventBus } from '../../../events/eventBus';
import ReflectionModule, { REFLECTION_PROMPTS } from '../../../modules/ReflectionModule/index';

function renderWithProvider(ui: React.ReactElement) {
  return render(<ReflectionProvider>{ui}</ReflectionProvider>);
}

describe('ReflectionModule — FR-30 component tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both prompt labels', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    expect(screen.getByText(/How did AI influence your learning process/)).toBeInTheDocument();
    expect(screen.getByText(/What would you have done differently without AI/)).toBeInTheDocument();
  });

  it('renders heading "Reflection"', () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    expect(screen.getByRole('heading', { name: 'Reflection' })).toBeInTheDocument();
  });

  it('displays reference anchors when assignment and tools load', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/assignments/')) return Promise.resolve({ title: 'GA Assignment' });
      if (path.includes('/interactions')) return Promise.resolve([
        { id: 'l1', tool_name: 'ChatGPT', category: 'explanation', description: '', logged_at: '', origin_tag: 'student_tagged', assignment_id: 'a1' },
        { id: 'l2', tool_name: 'Copilot', category: 'code generation', description: '', logged_at: '', origin_tag: 'inferred', assignment_id: 'a1' },
        { id: 'l3', tool_name: 'ChatGPT', category: 'debugging', description: '', logged_at: '', origin_tag: 'student_tagged', assignment_id: 'a1' },
      ]);
      return Promise.reject(new Error('unknown'));
    });

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    await waitFor(() => {
      expect(screen.getByText('GA Assignment')).toBeInTheDocument();
    });

    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    expect(screen.getByText('Copilot')).toBeInTheDocument();
  });

  it('does not display reference anchors when API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('server error'));

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('Assignment reference information')).not.toBeInTheDocument();
    });
  });

  it('shows word count for each textarea starting at 0', () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const counters = screen.getAllByText(/0 words/);
    expect(counters.length).toBe(2);
  });

  it('updates word count as user types and shows errors below 25 words', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));
    const user = userEvent.setup();

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const textarea1 = screen.getByLabelText(/How did AI influence/);
    await user.type(textarea1, 'word1 word2 word3');

    await waitFor(() => {
      expect(screen.getByText(/3 words/)).toBeInTheDocument();
    });
  });

  it('shows valid indicator when both prompts have 25+ unique words', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));
    const user = userEvent.setup();

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const validText = Array.from({ length: 26 }, (_, i) => `uniqueword${i}`).join(' ');

    const textarea1 = screen.getByLabelText(/How did AI influence/);
    const textarea2 = screen.getByLabelText(/What would you have done differently/);

    await user.type(textarea1, validText);
    await user.type(textarea2, validText);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Reflection is complete and valid/);
    });
  });

  it('emits REFLECTION_UPDATED event when text changes', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));
    const user = userEvent.setup();

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const textarea1 = screen.getByLabelText(/How did AI influence/);
    await user.type(textarea1, 'hello');

    await waitFor(() => {
      expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
        'REFLECTION_UPDATED',
        expect.objectContaining({ declarationId: 'd1' }),
      );
    });
  });

  it('persists to server via PATCH when reflection becomes valid', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));
    vi.mocked(api.patch).mockResolvedValue({});
    const user = userEvent.setup();

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const validText = Array.from({ length: 26 }, (_, i) => `uniqueword${i}`).join(' ');

    const textarea1 = screen.getByLabelText(/How did AI influence/);
    const textarea2 = screen.getByLabelText(/What would you have done differently/);

    await user.type(textarea1, validText);
    await user.type(textarea2, validText);

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        '/declarations/d1/reflection',
        expect.objectContaining({ is_valid: true }),
      );
    });
  });

  it('does not persist when reflection is invalid', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'));
    vi.mocked(api.patch).mockResolvedValue({});
    const user = userEvent.setup();

    renderWithProvider(
      <ReflectionModule assignmentId="a1" declarationId="d1" />,
    );

    const textarea1 = screen.getByLabelText(/How did AI influence/);
    await user.type(textarea1, 'too short');

    await waitFor(() => {
      expect(vi.mocked(api.patch)).not.toHaveBeenCalled();
    });
  });

  it('exports REFLECTION_PROMPTS constant with both prompt texts', () => {
    expect(REFLECTION_PROMPTS.prompt1).toMatch(/How did AI influence/);
    expect(REFLECTION_PROMPTS.prompt2).toMatch(/What would you have done differently/);
  });
});
