// Component tests for ManualUsageModule
// Covers: form display, submission, deletion, validation, error handling, word count

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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
import ManualUsageModule, { REASON_OPTIONS, MANUAL_DESCRIPTION_MIN_WORDS } from '../../../modules/ManualUsageModule/index';

describe('ManualUsageModule — component tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and description text', () => {
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    expect(screen.getByRole('heading', { name: /Manual AI Usage Declaration/ })).toBeInTheDocument();
    expect(screen.getByText(/Declare any AI usage that was not captured/)).toBeInTheDocument();
  });

  it('shows "Add Manual Entry" button initially and hides the form', () => {
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    expect(screen.getByText('+ Add Manual Entry')).toBeInTheDocument();
    expect(screen.queryByText('Save Entry')).not.toBeInTheDocument();
  });

  it('shows form when "Add Manual Entry" button is clicked', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    expect(screen.getByText('Add Manual AI Usage Entry')).toBeInTheDocument();
    expect(screen.getByLabelText(/AI tool name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Approximate date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/How was the tool used/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Why was this usage not captured/)).toBeInTheDocument();
  });

  it('hides form when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));
    expect(screen.getByText('Save Entry')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Save Entry')).not.toBeInTheDocument();
  });

  it('shows word count for description field', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    // Initially 0 words
    expect(screen.getByText(/0 words/)).toBeInTheDocument();
  });

  it('updates word count as user types in description', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    const desc = screen.getByLabelText(/How was the tool used/);
    await user.type(desc, 'one two three');

    await waitFor(() => {
      expect(screen.getByText(/3 words/)).toBeInTheDocument();
    });
  });

  it('shows "other" reason text field when "Other" reason is selected', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    const reasonSelect = screen.getByLabelText(/Why was this usage not captured/);
    await user.selectOptions(reasonSelect, 'other');

    expect(screen.getByLabelText(/Please specify/)).toBeInTheDocument();
  });

  it('submits a manual entry successfully and emits event', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ entryId: 'manual-1' });

    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    await user.type(screen.getByLabelText(/AI tool name/), 'ChatGPT');
    await user.type(screen.getByLabelText(/Approximate date/), 'Nov 14 2025');

    const descText = 'I used ChatGPT to help me understand the genetic algorithm concepts including crossover mutation and fitness functions for my assignment';
    await user.type(screen.getByLabelText(/How was the tool used/), descText);

    await user.selectOptions(screen.getByLabelText(/Why was this usage not captured/), 'external_device');

    await user.click(screen.getByText('Save Entry'));

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/declarations/d1/manual-entries',
        expect.objectContaining({ tool_name: 'ChatGPT' }),
      );
    });

    expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
      'MANUAL_ENTRY_ADDED',
      expect.objectContaining({ entryId: 'manual-1' }),
    );

    await waitFor(() => {
      expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    });
  });

  it('shows error message when submission fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue(new Error('Server error'));

    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    await user.type(screen.getByLabelText(/AI tool name/), 'ChatGPT');
    await user.type(screen.getByLabelText(/Approximate date/), 'Nov 14 2025');

    const descText = 'I used ChatGPT to help me understand the genetic algorithm concepts including crossover mutation and fitness functions for my assignment';
    await user.type(screen.getByLabelText(/How was the tool used/), descText);
    await user.selectOptions(screen.getByLabelText(/Why was this usage not captured/), 'external_device');

    await user.click(screen.getByText('Save Entry'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Server error/);
    });
  });

  it('deletes an entry and emits MANUAL_ENTRY_REMOVED', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ entryId: 'manual-1' });
    vi.mocked(api.delete).mockResolvedValue({});

    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));
    await user.type(screen.getByLabelText(/AI tool name/), 'Claude');
    await user.type(screen.getByLabelText(/Approximate date/), 'Dec 1 2025');

    const descText = 'I used Claude to review my code changes and identify potential bugs in the sorting algorithm implementation for this homework';
    await user.type(screen.getByLabelText(/How was the tool used/), descText);
    await user.selectOptions(screen.getByLabelText(/Why was this usage not captured/), 'unintegrated_tool');

    await user.click(screen.getByText('Save Entry'));

    await waitFor(() => {
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/Delete manual entry for Claude/));

    await waitFor(() => {
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/declarations/d1/manual-entries/manual-1');
    });

    expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
      'MANUAL_ENTRY_REMOVED',
      expect.objectContaining({ entryId: 'manual-1' }),
    );
  });

  it('calls onCountChange when entries change', async () => {
    const user = userEvent.setup();
    const onCountChange = vi.fn();
    vi.mocked(api.post).mockResolvedValue({ entryId: 'manual-1' });

    render(<ManualUsageModule assignmentId="a1" declarationId="d1" onCountChange={onCountChange} />);

    expect(onCountChange).toHaveBeenCalledWith(0);

    await user.click(screen.getByText('+ Add Manual Entry'));
    await user.type(screen.getByLabelText(/AI tool name/), 'ChatGPT');
    await user.type(screen.getByLabelText(/Approximate date/), 'Nov 14 2025');

    const descText = 'I used ChatGPT to help me understand the genetic algorithm concepts including crossover mutation and fitness functions for my assignment';
    await user.type(screen.getByLabelText(/How was the tool used/), descText);
    await user.selectOptions(screen.getByLabelText(/Why was this usage not captured/), 'external_device');

    await user.click(screen.getByText('Save Entry'));

    await waitFor(() => {
      expect(onCountChange).toHaveBeenCalledWith(1);
    });
  });

  it('exports REASON_OPTIONS and MANUAL_DESCRIPTION_MIN_WORDS constants', () => {
    expect(REASON_OPTIONS).toHaveLength(4);
    expect(REASON_OPTIONS[0].value).toBe('external_device');
    expect(REASON_OPTIONS[3].value).toBe('other');
    expect(MANUAL_DESCRIPTION_MIN_WORDS).toBe(15);
  });

  it('renders all reason options in the dropdown', async () => {
    const user = userEvent.setup();
    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));

    for (const opt of REASON_OPTIONS) {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    }
  });

  it('displays reason label for submitted entry with "other" reason', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ entryId: 'manual-1' });

    render(<ManualUsageModule assignmentId="a1" declarationId="d1" />);

    await user.click(screen.getByText('+ Add Manual Entry'));
    await user.type(screen.getByLabelText(/AI tool name/), 'Bard');
    await user.type(screen.getByLabelText(/Approximate date/), 'Oct 2025');

    const descText = 'I used Google Bard to generate initial pseudocode for the genetic algorithm before I began coding the real implementation in Python';
    await user.type(screen.getByLabelText(/How was the tool used/), descText);
    await user.selectOptions(screen.getByLabelText(/Why was this usage not captured/), 'other');

    await user.type(screen.getByLabelText(/Please specify/), 'Used on phone');

    await user.click(screen.getByText('Save Entry'));

    await waitFor(() => {
      expect(screen.getByText(/Other — please specify/)).toBeInTheDocument();
      expect(screen.getByText(/Used on phone/)).toBeInTheDocument();
    });
  });
});
