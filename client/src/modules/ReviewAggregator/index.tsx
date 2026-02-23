// ReviewAggregator — R-3
// Assembles the full read-only preview on review step entry.
// Two-step confirmation:
//   (1) Checkbox: "I confirm this declaration accurately and completely
//       represents my AI usage for this assignment."
//       (+ "I acknowledge the unresolved warnings..." when warnings exist)
//   (2) "Submit Declaration" button (enabled only after checkbox is checked)
//
// R-3: review step is NOT skippable via a single click
// R-9(b): snapshot created on review step entry
// R-9(c): snapshot created on final submission
// R-8: warning acknowledgment is mandatory and recorded

import React, { useEffect, useState } from 'react';
import type { DeclarationFull } from '../../types/api';
import { api } from '../../hooks/useApi';
import { useWarnings } from '../../contexts/WarningsContext';
import { useReflection } from '../../contexts/ReflectionContext';
import { createSnapshot } from '../../services/VersionHistoryService';
import { eventBus } from '../../events/eventBus';
import OriginBadge from '../DraftEditorModule/OriginBadge';
import type { OriginType, WarningCondition } from '../../events/types';

const WARNING_CONDITION_LABELS: Record<WarningCondition, string> = {
  entry_deleted: 'Entry deleted',
  scope_reduced: 'Scope reduction detected',
  coverage_low: 'Low coverage',
  tool_missing: 'AI tool not mentioned',
};

interface Props {
  declarationId: string;
}

// R-3: ReviewAggregator
const ReviewAggregator: React.FC<Props> = ({ declarationId }) => {
  const { warnings } = useWarnings();
  const { isValid: reflectionValid } = useReflection();
  const [declarationData, setDeclarationData] = useState<DeclarationFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const hasWarnings = warnings.length > 0;

  // Load full declaration data
  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<DeclarationFull>(`/declarations/${declarationId}`);
        setDeclarationData(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [declarationId]);

  // R-9(b): create snapshot when student arrives at review step
  useEffect(() => {
    if (!declarationId) return;
    void createSnapshot(declarationId, 'review_step', warnings);
    // Also emit for VersionHistoryService subscribers
    eventBus.emit('DECLARATION_SNAPSHOT', {
      declarationId,
      assignmentId: declarationData?.declaration.assignment_id ?? '',
      trigger: 'review_step',
      timestamp: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declarationId]);

  // R-3: confirmation checkbox text changes when warnings exist
  const confirmationText = hasWarnings
    ? 'I confirm this declaration accurately and completely represents my AI usage for this assignment, and I acknowledge the unresolved warnings and confirm the declaration is still accurate.'
    : 'I confirm this declaration accurately and completely represents my AI usage for this assignment.';

  const handleSubmit = async () => {
    if (!isConfirmed) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/declarations/${declarationId}/submit`, {});
      // R-9(c): submission snapshot is created server-side on submit
      setIsSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section aria-labelledby="review-success-heading">
        <h2 id="review-success-heading" style={{ color: 'var(--badge-manual-text)' }}>
          ✓ Declaration Submitted
        </h2>
        <p>Your AI usage declaration has been submitted successfully.</p>
      </section>
    );
  }

  if (loading) {
    return <p aria-busy="true">Loading review…</p>;
  }

  if (!declarationData) {
    return <p role="alert" style={{ color: 'var(--color-error-text)' }}>Could not load declaration.</p>;
  }

  const { entries, manualEntries, reflection } = declarationData;

  return (
    <section aria-labelledby="review-heading">
      <h2 id="review-heading">Review Your Declaration</h2>

      {/* Warnings summary — R-3: count shown in preview */}
      {hasWarnings && (
        <div
          role="region"
          aria-label="Active integrity warnings"
          aria-live="assertive"
          style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
          }}
        >
          <strong style={{ color: 'var(--color-warning-text)' }}>
            ⚠ {warnings.length} active integrity warning{warnings.length > 1 ? 's' : ''}
          </strong>
          <ul style={{ margin: '0.5rem 0 0', padding: '0 0 0 1.25rem' }}>
            {warnings.map((w) => (
              <li key={w.id} style={{ fontSize: '0.8rem', color: 'var(--color-warning-text)' }}>
                <strong>{WARNING_CONDITION_LABELS[w.condition]}:</strong> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Declaration entries — read-only */}
      <section aria-labelledby="review-entries-heading" style={{ marginBottom: '2rem' }}>
        <h3 id="review-entries-heading">Declaration Entries</h3>
        {entries.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No entries.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {entry.field_name.replace(/_/g, ' ')}
                  </span>
                  <OriginBadge origin={entry.origin as OriginType} />
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>{entry.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Manual entries — read-only */}
      {manualEntries.length > 0 && (
        <section aria-labelledby="review-manual-heading" style={{ marginBottom: '2rem' }}>
          <h3 id="review-manual-heading">Manual Usage Entries</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {manualEntries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <strong>{entry.tool_name}</strong>
                  <OriginBadge origin="manual" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{entry.date_range}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>{entry.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reflection — read-only */}
      <section aria-labelledby="review-reflection-heading" style={{ marginBottom: '2rem' }}>
        <h3 id="review-reflection-heading">Reflection</h3>
        {!reflection || !reflection.is_valid ? (
          <p
            role="alert"
            style={{
              color: 'var(--color-error-text)',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              padding: '0.75rem',
              borderRadius: '0.375rem',
            }}
          >
            ⚠ Reflection is not complete. Please return to the Reflection step and
            complete both prompts (minimum 25 words each) before submitting.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              How did AI influence your learning process for this assignment?
            </p>
            <p style={{ margin: '0 0 1rem', paddingLeft: '0.75rem', borderLeft: '3px solid var(--color-border)' }}>
              {reflection.prompt1}
            </p>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              What would you have done differently without AI assistance?
            </p>
            <p style={{ margin: 0, paddingLeft: '0.75rem', borderLeft: '3px solid var(--color-border)' }}>
              {reflection.prompt2}
            </p>
          </>
        )}
      </section>

      {/* R-3: Two-step confirmation — cannot submit without both steps */}
      <section
        aria-labelledby="review-confirm-heading"
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          background: 'var(--color-surface)',
        }}
      >
        <h3 id="review-confirm-heading" style={{ marginTop: 0 }}>
          Confirm Submission
        </h3>

        {/* Step 1 — R-3: Checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            id="confirm-checkbox"
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            disabled={!reflectionValid}
            style={{ marginTop: '0.2rem', flexShrink: 0, width: '1.1rem', height: '1.1rem' }}
          />
          <label
            htmlFor="confirm-checkbox"
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              cursor: reflectionValid ? 'pointer' : 'not-allowed',
              color: reflectionValid ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {confirmationText}
          </label>
        </div>

        {!reflectionValid && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-error-text)', marginBottom: '0.75rem' }}>
            Complete your reflection before you can confirm and submit.
          </p>
        )}

        {submitError && (
          <p role="alert" style={{ color: 'var(--color-error-text)', fontSize: '0.85rem' }}>
            {submitError}
          </p>
        )}

        {/* Step 2 — R-3: Submit button, enabled only after checkbox */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!isConfirmed || isSubmitting}
          aria-disabled={!isConfirmed || isSubmitting}
          style={{
            padding: '0.6rem 1.75rem',
            background: isConfirmed ? 'var(--color-primary)' : 'var(--color-border)',
            color: isConfirmed ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isConfirmed && !isSubmitting ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Declaration'}
        </button>
      </section>
    </section>
  );
};

export default ReviewAggregator;
