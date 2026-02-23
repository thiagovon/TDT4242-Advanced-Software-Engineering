// ManualUsageModule — R-10
// Structured form for declaring AI usage not captured by the logger.
// R-10: four required fields, predefined reason dropdown
// R-10: ≥15 words for description field
// Emits MANUAL_ENTRY_ADDED / MANUAL_ENTRY_REMOVED for IntegrityMonitor

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { eventBus } from '../../events/eventBus';
import { api } from '../../hooks/useApi';
import type { ManualUsageEntry } from '../../types/api';

/** R-10: Predefined reason options */
export const REASON_OPTIONS = [
  { value: 'external_device', label: 'Used on a personal/external device' },
  { value: 'unintegrated_tool', label: 'Used a tool not integrated with AIGuidebook' },
  { value: 'before_logging', label: 'Used before the logging period' },
  { value: 'other', label: 'Other — please specify' },
] as const;

export type ReasonValue = (typeof REASON_OPTIONS)[number]['value'];

export const MANUAL_DESCRIPTION_MIN_WORDS = 15;

interface Props {
  assignmentId: string;
  declarationId: string;
  onCountChange?: (count: number) => void;
}

interface FormValues {
  tool_name: string;
  date_range: string;
  description: string;
  reason: ReasonValue | '';
  reason_other: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// R-10: ManualUsageModule
const ManualUsageModule: React.FC<Props> = ({ declarationId, onCountChange }) => {
  const [entries, setEntries] = useState<ManualUsageEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { tool_name: '', date_range: '', description: '', reason: '', reason_other: '' },
    mode: 'onTouched',
  });

  const selectedReason = watch('reason');
  const descriptionValue = watch('description');
  const descriptionWordCount = countWords(descriptionValue ?? '');

  // Notify parent of count changes (R-2 sync)
  useEffect(() => {
    onCountChange?.(entries.length);
  }, [entries.length, onCountChange]);

  const onAddEntry = handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { entryId } = await api.post<{ entryId: string }>(
        `/declarations/${declarationId}/manual-entries`,
        {
          tool_name: data.tool_name,
          date_range: data.date_range,
          description: data.description,
          reason: data.reason,
          reason_other: data.reason === 'other' ? data.reason_other : undefined,
        },
      );

      const newEntry: ManualUsageEntry = {
        id: entryId,
        declaration_id: declarationId,
        tool_name: data.tool_name,
        date_range: data.date_range,
        description: data.description,
        reason: data.reason as ReasonValue,
        reason_other: data.reason === 'other' ? data.reason_other : null,
        created_at: new Date().toISOString(),
      };

      setEntries((prev) => [...prev, newEntry]);
      reset();
      setShowForm(false);

      // R-10: emit so IntegrityMonitor can update coverage
      eventBus.emit('MANUAL_ENTRY_ADDED', {
        entryId,
        assignmentId: '',  // filled by context in a real implementation
        toolName: data.tool_name,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async (entryId: string) => {
    try {
      await api.delete(`/declarations/${declarationId}/manual-entries/${entryId}`);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      eventBus.emit('MANUAL_ENTRY_REMOVED', { entryId, assignmentId: '' });
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const reasonLabel = (reason: ReasonValue) =>
    REASON_OPTIONS.find((r) => r.value === reason)?.label ?? reason;

  return (
    <section aria-labelledby="manual-usage-heading">
      <h2 id="manual-usage-heading">Manual AI Usage Declaration</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Declare any AI usage that was not captured by the logging system —
        for example, usage on external devices or platforms not integrated with AIGuidebook.
      </p>

      {/* Entry list */}
      {entries.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.25rem' }}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '0.75rem',
                background: 'var(--color-surface)',
              }}
              aria-label={`Manual entry: ${entry.tool_name}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{entry.tool_name}</strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {entry.date_range}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry.id)}
                  aria-label={`Delete manual entry for ${entry.tool_name}`}
                  style={{
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error-text)',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
              <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.875rem' }}>{entry.description}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Reason: {reasonLabel(entry.reason)}
                {entry.reason_other ? ` — ${entry.reason_other}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Add entry button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Add Manual Entry
        </button>
      )}

      {/* Add form — R-10 */}
      {showForm && (
        <form
          onSubmit={onAddEntry}
          noValidate
          aria-labelledby="manual-form-heading"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            background: 'var(--color-surface)',
          }}
        >
          <h3 id="manual-form-heading" style={{ marginTop: 0 }}>
            Add Manual AI Usage Entry
          </h3>

          {/* R-10(a): Tool name */}
          <FieldWrapper label="AI tool name or description" htmlFor="manual-tool-name" required>
            <input
              id="manual-tool-name"
              type="text"
              {...register('tool_name', { required: 'AI tool name is required.' })}
              placeholder="e.g. ChatGPT, Claude, GitHub Copilot"
              aria-invalid={errors.tool_name ? true : undefined}
              aria-describedby={errors.tool_name ? 'tool-name-error' : undefined}
              style={inputStyle(!!errors.tool_name)}
            />
            {errors.tool_name && (
              <FieldError id="tool-name-error">{errors.tool_name.message}</FieldError>
            )}
          </FieldWrapper>

          {/* R-10(b): Date range */}
          <FieldWrapper label="Approximate date or date range of use" htmlFor="manual-date-range" required>
            <input
              id="manual-date-range"
              type="text"
              {...register('date_range', { required: 'Date or date range is required.' })}
              placeholder="e.g. November 14 2025, or Nov 10–15 2025"
              aria-invalid={errors.date_range ? true : undefined}
              aria-describedby={errors.date_range ? 'date-range-error' : undefined}
              style={inputStyle(!!errors.date_range)}
            />
            {errors.date_range && (
              <FieldError id="date-range-error">{errors.date_range.message}</FieldError>
            )}
          </FieldWrapper>

          {/* R-10(c): Description ≥15 words */}
          <FieldWrapper
            label={`How was the tool used? (minimum ${MANUAL_DESCRIPTION_MIN_WORDS} words)`}
            htmlFor="manual-description"
            required
          >
            <textarea
              id="manual-description"
              {...register('description', {
                required: 'Description is required.',
                validate: (v) =>
                  countWords(v) >= MANUAL_DESCRIPTION_MIN_WORDS ||
                  `Please write at least ${MANUAL_DESCRIPTION_MIN_WORDS} words (currently ${countWords(v)}).`,
              })}
              rows={4}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`manual-desc-counter${errors.description ? ' manual-desc-error' : ''}`}
              style={{ ...inputStyle(!!errors.description), resize: 'vertical' }}
            />
            {/* R-7: aria-live for word count */}
            <div
              id="manual-desc-counter"
              aria-live="polite"
              style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--color-text-muted)' }}
            >
              {descriptionWordCount} word{descriptionWordCount !== 1 ? 's' : ''}
              {descriptionWordCount < MANUAL_DESCRIPTION_MIN_WORDS
                ? ` — ${MANUAL_DESCRIPTION_MIN_WORDS - descriptionWordCount} more needed`
                : ' ✓'}
            </div>
            {errors.description && (
              <FieldError id="manual-desc-error">{errors.description.message}</FieldError>
            )}
          </FieldWrapper>

          {/* R-10(d): Reason (predefined list) */}
          <FieldWrapper label="Why was this usage not captured by the logging system?" htmlFor="manual-reason" required>
            <select
              id="manual-reason"
              {...register('reason', { required: 'Please select a reason.' })}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? 'reason-error' : undefined}
              style={inputStyle(!!errors.reason)}
            >
              <option value="">— Select a reason —</option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.reason && (
              <FieldError id="reason-error">{errors.reason.message}</FieldError>
            )}
          </FieldWrapper>

          {/* R-10(d): Other reason text */}
          {selectedReason === 'other' && (
            <FieldWrapper label="Please specify" htmlFor="manual-reason-other" required>
              <input
                id="manual-reason-other"
                type="text"
                {...register('reason_other', {
                  validate: (v) =>
                    selectedReason !== 'other' || v.trim().length > 0 || 'Please specify the reason.',
                })}
                aria-invalid={errors.reason_other ? true : undefined}
                aria-describedby={errors.reason_other ? 'reason-other-error' : undefined}
                style={inputStyle(!!errors.reason_other)}
              />
              {errors.reason_other && (
                <FieldError id="reason-other-error">{errors.reason_other.message}</FieldError>
              )}
            </FieldWrapper>
          )}

          {submitError && (
            <p role="alert" style={{ color: 'var(--color-error-text)', fontSize: '0.85rem' }}>
              {submitError}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'var(--color-primary)',
                color: 'var(--color-primary-text)',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: isSubmitting ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {isSubmitting ? 'Saving…' : 'Save Entry'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); setSubmitError(null); }}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

// ─── Small helpers ─────────────────────────────────────────────────────────────

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '0.5rem',
    border: `1px solid ${hasError ? 'var(--color-error-border)' : 'var(--color-border)'}`,
    borderRadius: '0.25rem',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
  };
}

const FieldWrapper: React.FC<{
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.875rem' }}>
      {label}
      {required && <span aria-hidden="true" style={{ color: 'var(--color-error-text)', marginLeft: '0.2rem' }}>*</span>}
    </label>
    {children}
  </div>
);

const FieldError: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <p id={id} role="alert" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-error-text)' }}>
    {children}
  </p>
);

export default ManualUsageModule;
