// Tests for Entry Editing — FR-29, FR-32
// UT-09: blank edit validation
// IT-03: inline edit flow, origin badge transition, diff tracking

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import EntryRow from '../../../modules/DraftEditorModule/EntryRow';
import type { DeclarationEntry } from '../../../types/api';

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
import { eventBus } from '../../../events/eventBus';

const mockEntry: DeclarationEntry = {
  id: 'entry-001',
  declaration_id: 'decl-001',
  interaction_log_id: 'log-001',
  field_name: 'usage_summary',
  content: 'ChatGPT was used for research: literature review on evolutionary algorithms.',
  origin: 'auto-generated',
  previous_content: null,
  diff_delta: null,
  created_at: '2025-10-22T11:00:00Z',
  updated_at: '2025-10-22T11:00:00Z',
};

function renderEntry(entry: DeclarationEntry = mockEntry) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  const result = render(
    <EntryRow
      entry={entry}
      declarationId="decl-001"
      onUpdated={onUpdated}
      onDeleted={onDeleted}
    />,
  );
  return { ...result, onUpdated, onDeleted };
}

describe('FR-29/FR-32: Entry Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UT-09: save button disabled when content unchanged (isDirty check)
  it('UT-09: Save button is disabled when content has not been changed', async () => {
    renderEntry();

    // Click Edit to enter editing mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Usage Summary/i }));

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Save should be disabled because content hasn't changed
    expect(screen.getByText('Save')).toBeDisabled();
  });

  // IT-03: successful edit updates origin and emits events
  it('IT-03: editing entry triggers PATCH, updates origin to auto-generated-modified, and emits events', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      updated: true,
      newOrigin: 'auto-generated-modified',
      diffDelta: -25,
    });

    const { onUpdated } = renderEntry();
    const user = userEvent.setup();

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Usage Summary/i }));

    // Modify content
    const textarea = screen.getByLabelText(/Edit Usage Summary/i);
    await user.clear(textarea);
    await user.type(textarea, 'ChatGPT was used briefly for background reading.');

    // Save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/declarations/decl-001/entries/entry-001',
        { content: 'ChatGPT was used briefly for background reading.' },
      );
    });

    // Verify ENTRY_MODIFIED event emitted
    expect(eventBus.emit).toHaveBeenCalledWith(
      'ENTRY_MODIFIED',
      expect.objectContaining({
        entryId: 'entry-001',
        previousContent: mockEntry.content,
        newContent: 'ChatGPT was used briefly for background reading.',
        previousOrigin: 'auto-generated',
        newOrigin: 'auto-generated-modified',
        diffLengthDelta: -25,
      }),
    );

    // Verify FIELD_EDITED event emitted
    expect(eventBus.emit).toHaveBeenCalledWith(
      'FIELD_EDITED',
      expect.objectContaining({
        entryId: 'entry-001',
        fieldName: 'usage_summary',
        previousOrigin: 'auto-generated',
        newOrigin: 'auto-generated-modified',
      }),
    );

    // Verify callback with updated entry
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'auto-generated-modified',
        content: 'ChatGPT was used briefly for background reading.',
        previous_content: mockEntry.content,
        diff_delta: -25,
      }),
    );
  });

  // IT-03: cancel edit reverts content
  it('FR-29: Cancel button reverts to original content', async () => {
    renderEntry();
    const user = userEvent.setup();

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Usage Summary/i }));
    const textarea = screen.getByLabelText(/Edit Usage Summary/i);
    await user.clear(textarea);
    await user.type(textarea, 'Some different text');

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should show original content, not edit form
    await waitFor(() => {
      expect(screen.getByText(mockEntry.content)).toBeInTheDocument();
    });
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  // FR-32: editing an auto-generated entry shows previous_content disclosure
  it('FR-32: shows "Original auto-generated content" disclosure for edited entries', () => {
    const editedEntry: DeclarationEntry = {
      ...mockEntry,
      origin: 'auto-generated-modified',
      content: 'ChatGPT was used briefly for background reading.',
      previous_content: mockEntry.content,
      diff_delta: -25,
    };

    renderEntry(editedEntry);

    expect(screen.getByText('Original auto-generated content')).toBeInTheDocument();
    expect(screen.getByText(mockEntry.content)).toBeInTheDocument();
  });

  // FR-32: original auto-generated entries do NOT show previous_content disclosure
  it('FR-32: does not show previous content disclosure for unedited entries', () => {
    renderEntry(mockEntry);

    expect(screen.queryByText('Original auto-generated content')).not.toBeInTheDocument();
  });

  // FR-29: delete triggers API call and emits ENTRY_DELETED event
  it('FR-29: delete calls API and emits ENTRY_DELETED event', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { onDeleted } = renderEntry();

    fireEvent.click(screen.getByRole('button', { name: /Delete Usage Summary/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/declarations/decl-001/entries/entry-001');
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'ENTRY_DELETED',
      expect.objectContaining({
        entryId: 'entry-001',
      }),
    );

    expect(onDeleted).toHaveBeenCalledWith('entry-001');
  });

  // FR-29: delete is cancelled when user declines confirmation
  it('FR-29: delete is cancelled when confirm dialog is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { onDeleted } = renderEntry();

    fireEvent.click(screen.getByRole('button', { name: /Delete Usage Summary/i }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  // IT-03: error handling on save failure
  it('IT-03: shows error message when save fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Network error'));

    renderEntry();
    const user = userEvent.setup();

    fireEvent.click(screen.getByRole('button', { name: /Edit Usage Summary/i }));
    const textarea = screen.getByLabelText(/Edit Usage Summary/i);
    await user.clear(textarea);
    await user.type(textarea, 'Changed content');
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
