// EntryRow — R-1, R-4
// Renders a single declaration entry with inline editing and origin badge.
// On edit: origin transitions auto-generated → auto-generated-modified (R-1).
// On save: emits FIELD_EDITED / ENTRY_MODIFIED via event bus (R-4).
// On delete: emits ENTRY_DELETED via event bus (R-4, R-8(a)).

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { DeclarationEntry } from '../../types/api';
import type { OriginType } from '../../events/types';
import { eventBus } from '../../events/eventBus';
import { api } from '../../hooks/useApi';
import OriginBadge from './OriginBadge';

interface Props {
  entry: DeclarationEntry;
  declarationId: string;
  onUpdated: (updated: DeclarationEntry) => void;
  onDeleted: (entryId: string) => void;
}

interface FormValues {
  content: string;
}

// R-4: EntryRow
const EntryRow: React.FC<Props> = ({ entry, declarationId, onUpdated, onDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormValues>({
    defaultValues: { content: entry.content },
  });

  const onSave = handleSubmit(async ({ content }) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await api.patch<{ updated: boolean; newOrigin: OriginType; diffDelta: number }>(
        `/declarations/${declarationId}/entries/${entry.id}`,
        { content },
      );

      const updated: DeclarationEntry = {
        ...entry,
        content,
        origin: result.newOrigin,
        previous_content: entry.previous_content ?? entry.content,
        diff_delta: result.diffDelta,
      };

      // R-4: emit ENTRY_MODIFIED
      eventBus.emit('ENTRY_MODIFIED', {
        entryId: entry.id,
        previousContent: entry.content,
        newContent: content,
        previousOrigin: entry.origin as OriginType,
        newOrigin: result.newOrigin,
        diffLengthDelta: result.diffDelta,
      });

      // R-4: emit FIELD_EDITED
      eventBus.emit('FIELD_EDITED', {
        entryId: entry.id,
        fieldName: entry.field_name,
        previousValue: entry.content,
        newValue: content,
        previousOrigin: entry.origin as OriginType,
        newOrigin: result.newOrigin,
      });

      onUpdated(updated);
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!confirm('Delete this entry? This action will be tracked as a potential underrepresentation (R-8).')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/declarations/${declarationId}/entries/${entry.id}`);
      // R-4 / R-8(a): emit ENTRY_DELETED
      eventBus.emit('ENTRY_DELETED', {
        entryId: entry.id,
        entry: {
          id: entry.id,
          declarationId: entry.declaration_id,
          assignmentId: '', // filled by parent
          fieldName: entry.field_name,
          content: entry.content,
          origin: entry.origin as OriginType,
          previousContent: entry.previous_content ?? undefined,
          interactionLogId: entry.interaction_log_id ?? undefined,
        },
      });
      onDeleted(entry.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    reset({ content: entry.content });
    setIsEditing(false);
    setError(null);
  };

  const fieldLabel = entry.field_name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '0.75rem',
        background: 'var(--color-surface)',
      }}
      role="article"
      aria-label={`Declaration entry: ${fieldLabel}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          {fieldLabel}
        </span>
        <OriginBadge origin={entry.origin as OriginType} />
      </div>

      {isEditing ? (
        <form onSubmit={onSave} noValidate>
          <textarea
            {...register('content', { required: 'Content is required' })}
            rows={4}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: '0.25rem',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
            aria-label={`Edit ${fieldLabel}`}
            autoFocus
          />
          {error && (
            <p role="alert" style={{ color: 'var(--color-error-text)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              style={{
                padding: '0.4rem 1rem',
                background: 'var(--color-primary)',
                color: 'var(--color-primary-text)',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: isSaving ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '0.4rem 1rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
            {entry.content}
          </p>
          {entry.previous_content && (
            <details style={{ marginBottom: '0.5rem' }}>
              <summary style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                Original auto-generated content
              </summary>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0 0.5rem' }}>
                {entry.previous_content}
              </p>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
              aria-label={`Edit ${fieldLabel}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: 'transparent',
                border: '1px solid var(--color-error-border)',
                color: 'var(--color-error-text)',
                borderRadius: '0.25rem',
                cursor: isDeleting ? 'wait' : 'pointer',
              }}
              aria-label={`Delete ${fieldLabel}`}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EntryRow;
