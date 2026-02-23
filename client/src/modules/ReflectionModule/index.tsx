// ReflectionModule — R-5
// Two structured prompts, ≥25 words each, repetition detection.
// Displays assignment name + logged AI tools as reference anchors.
// Emits REFLECTION_UPDATED on every change.
// Exposes isValid status via ReflectionContext.
//
// R-5: structured prompts, word validation, repetition detection
// R-7: aria-live="polite" for word count updates, keyboard navigation

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { eventBus } from '../../events/eventBus';
import { useSetReflection } from '../../contexts/ReflectionContext';
import { validateReflection, MIN_WORDS } from './validation';
import { api } from '../../hooks/useApi';
import type { InteractionLog } from '../../types/api';

export const REFLECTION_PROMPTS = {
  prompt1: 'How did AI influence your learning process for this assignment?',
  prompt2: 'What would you have done differently without AI assistance?',
} as const;

interface Props {
  assignmentId: string;
  declarationId: string;
}

interface FormValues {
  prompt1: string;
  prompt2: string;
}

// R-5: ReflectionModule
const ReflectionModule: React.FC<Props> = ({ assignmentId, declarationId }) => {
  const setReflection = useSetReflection();
  const [tools, setTools] = React.useState<string[]>([]);
  const [assignmentTitle, setAssignmentTitle] = React.useState<string>('');

  // R-5: reference anchors — load assignment + tools
  useEffect(() => {
    void (async () => {
      try {
        const [assignment, logs] = await Promise.all([
          api.get<{ title: string }>(`/assignments/${assignmentId}`),
          api.get<InteractionLog[]>(`/interactions?assignment_id=${assignmentId}&scoped=true`),
        ]);
        setAssignmentTitle(assignment.title);
        setTools([...new Set(logs.map((l) => l.tool_name))]);
      } catch {
        // Non-critical — reference anchors are informational
      }
    })();
  }, [assignmentId]);

  const {
    register,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { prompt1: '', prompt2: '' }, mode: 'onChange' });

  const prompt1Value = useWatch({ control, name: 'prompt1' });
  const prompt2Value = useWatch({ control, name: 'prompt2' });

  // Compute validation on every keystroke for real-time feedback (R-5)
  const validation = validateReflection(prompt1Value ?? '', prompt2Value ?? '');

  // Sync to ReflectionContext and emit event on every change
  useEffect(() => {
    const state = {
      prompt1: prompt1Value ?? '',
      prompt2: prompt2Value ?? '',
      isValid: validation.isValid,
      wordCountPrompt1: validation.prompt1.wordCount,
      wordCountPrompt2: validation.prompt2.wordCount,
    };
    setReflection(state);
    eventBus.emit('REFLECTION_UPDATED', { declarationId, ...state });
  }, [prompt1Value, prompt2Value, validation.isValid, declarationId, setReflection,
      validation.prompt1.wordCount, validation.prompt2.wordCount]);

  // Persist to server when valid
  useEffect(() => {
    if (!validation.isValid) return;
    void api.patch(`/declarations/${declarationId}/reflection`, {
      prompt1: prompt1Value,
      prompt2: prompt2Value,
      is_valid: validation.isValid,
      word_count_p1: validation.prompt1.wordCount,
      word_count_p2: validation.prompt2.wordCount,
    });
  }, [
    validation.isValid, declarationId, prompt1Value, prompt2Value,
    validation.prompt1.wordCount, validation.prompt2.wordCount,
  ]);

  return (
    <section aria-labelledby="reflection-heading">
      <h2 id="reflection-heading">Reflection</h2>

      {/* R-5: Reference anchors */}
      {(assignmentTitle || tools.length > 0) && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
          aria-label="Assignment reference information"
        >
          {assignmentTitle && (
            <p style={{ margin: '0 0 0.25rem' }}>
              <strong>Assignment:</strong> {assignmentTitle}
            </p>
          )}
          {tools.length > 0 && (
            <p style={{ margin: 0 }}>
              <strong>AI tools you used:</strong>{' '}
              {tools.map((t, i) => (
                <React.Fragment key={t}>
                  <span style={{ fontWeight: 600, color: 'var(--badge-auto-text)' }}>{t}</span>
                  {i < tools.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      )}

      <form noValidate>
        {/* Prompt 1 — R-5 */}
        <PromptField
          id="reflection-prompt1"
          label={REFLECTION_PROMPTS.prompt1}
          promptNumber={1}
          registration={register('prompt1')}
          wordCount={validation.prompt1.wordCount}
          minWords={MIN_WORDS}
          errors={validation.prompt1.errors}
          fieldError={errors.prompt1?.message}
        />

        {/* Prompt 2 — R-5 */}
        <PromptField
          id="reflection-prompt2"
          label={REFLECTION_PROMPTS.prompt2}
          promptNumber={2}
          registration={register('prompt2')}
          wordCount={validation.prompt2.wordCount}
          minWords={MIN_WORDS}
          errors={validation.prompt2.errors}
          fieldError={errors.prompt2?.message}
        />

        {/* Overall validity indicator */}
        {validation.isValid && (
          <p
            role="status"
            aria-live="polite"
            style={{ color: 'var(--badge-manual-text)', fontWeight: 600, fontSize: '0.875rem' }}
          >
            ✓ Reflection is complete and valid.
          </p>
        )}
      </form>
    </section>
  );
};

// ─── PromptField sub-component ───────────────────────────────────────────────

interface PromptFieldProps {
  id: string;
  label: string;
  promptNumber: number;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  wordCount: number;
  minWords: number;
  errors: string[];
  fieldError?: string;
}

const PromptField: React.FC<PromptFieldProps> = ({
  id,
  label,
  promptNumber,
  registration,
  wordCount,
  minWords,
  errors,
}) => {
  const isValid = errors.length === 0 && wordCount >= minWords;
  const remainingWords = Math.max(0, minWords - wordCount);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', lineHeight: 1.4 }}
      >
        {promptNumber}. {label}
      </label>
      <textarea
        id={id}
        {...registration}
        rows={6}
        aria-describedby={`${id}-counter ${id}-errors`}
        aria-invalid={errors.length > 0 ? true : undefined}
        style={{
          width: '100%',
          padding: '0.6rem',
          border: `1px solid ${errors.length > 0 ? 'var(--color-error-border)' : 'var(--color-border)'}`,
          borderRadius: '0.375rem',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          resize: 'vertical',
          lineHeight: 1.6,
        }}
      />

      {/* R-7: aria-live="polite" for word count */}
      <div
        id={`${id}-counter`}
        aria-live="polite"
        style={{
          fontSize: '0.75rem',
          marginTop: '0.25rem',
          color: isValid ? 'var(--badge-manual-text)' : 'var(--color-text-muted)',
          fontWeight: isValid ? 600 : 400,
        }}
      >
        {wordCount} word{wordCount !== 1 ? 's' : ''}
        {remainingWords > 0 ? ` — ${remainingWords} more needed` : ' ✓'}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul
          id={`${id}-errors`}
          role="alert"
          aria-live="polite"
          style={{ margin: '0.35rem 0 0', padding: '0 0 0 1.1rem' }}
        >
          {errors.map((err) => (
            <li key={err} style={{ fontSize: '0.8rem', color: 'var(--color-error-text)' }}>
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReflectionModule;
