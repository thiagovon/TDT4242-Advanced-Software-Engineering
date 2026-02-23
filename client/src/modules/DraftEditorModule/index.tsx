// DraftEditorModule — R-1, R-4
// Reads interaction logs scoped to the assignment's time period (R-11),
// generates declaration entries with origin: 'auto-generated' and visible badges,
// and emits domain events for cross-module communication.
//
// R-1: draft generation, origin badge persistence
// R-4: diff tracking, event emission
// R-11: time-period-scoped log reading
// R-9(a): initial_open snapshot triggered on declaration creation

import React, { useEffect, useReducer, useCallback, useMemo } from 'react';
import type { DeclarationEntry, InteractionLog, Declaration, Assignment } from '../../types/api';
import { api } from '../../hooks/useApi';
import EntryRow from './EntryRow';
import WarningBanner from '../IntegrityMonitor/WarningBanner';
import { useIntegrityMonitor } from '../IntegrityMonitor';
import UnassignedQueue from './UnassignedQueue'; // R-12

interface Props {
  assignmentId: string;
  studentId: string;
  /** R-2: lifted so StatsPanel can reflect real-time declared count */
  onEntriesChange?: (entries: DeclarationEntry[]) => void;
  /** Notifies App when a declaration is created, so other modules can use the ID */
  onDeclarationCreated?: (declarationId: string) => void;
}

interface State {
  status: 'idle' | 'loading' | 'ready' | 'error';
  assignment: Assignment | null;
  declaration: Declaration | null;
  entries: DeclarationEntry[];
  logs: InteractionLog[];
  error: string | null;
  isGenerating: boolean;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; assignment: Assignment; declaration: Declaration | null; entries: DeclarationEntry[]; logs: InteractionLog[] }
  | { type: 'ERROR'; message: string }
  | { type: 'SET_DECLARATION'; declaration: Declaration }
  | { type: 'GENERATING' }
  | { type: 'ENTRIES_GENERATED'; entries: DeclarationEntry[] }
  | { type: 'ENTRY_UPDATED'; entry: DeclarationEntry }
  | { type: 'ENTRY_DELETED'; entryId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING': return { ...state, status: 'loading', error: null };
    case 'LOADED': return {
      ...state,
      status: 'ready',
      assignment: action.assignment,
      declaration: action.declaration,
      entries: action.entries,
      logs: action.logs,
    };
    case 'ERROR': return { ...state, status: 'error', error: action.message };
    case 'SET_DECLARATION': return { ...state, declaration: action.declaration };
    case 'GENERATING': return { ...state, isGenerating: true };
    case 'ENTRIES_GENERATED': return { ...state, isGenerating: false, entries: action.entries };
    case 'ENTRY_UPDATED':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)),
      };
    case 'ENTRY_DELETED':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.entryId) };
  }
}

const INITIAL_STATE: State = {
  status: 'idle',
  assignment: null,
  declaration: null,
  entries: [],
  logs: [],
  error: null,
  isGenerating: false,
};

/**
 * R-1: Build declaration entry content from an interaction log entry.
 * Each interaction becomes two fields: a usage summary and a tool description.
 */
function buildEntriesFromLog(
  log: InteractionLog,
): Array<{ field_name: string; content: string; interaction_log_id: string }> {
  return [
    {
      field_name: 'usage_summary',
      content: `${log.tool_name} was used for ${log.category}: ${log.description}`,
      interaction_log_id: log.id,
    },
  ];
}

// R-1, R-4: DraftEditorModule
const DraftEditorModule: React.FC<Props> = ({ assignmentId, studentId, onEntriesChange, onDeclarationCreated }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // R-2: notify parent when entries change for StatsPanel sync
  useEffect(() => {
    onEntriesChange?.(state.entries);
  }, [state.entries, onEntriesChange]);

  // Load assignment, declaration (if exists), and scoped logs
  const load = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const [assignment, logs] = await Promise.all([
        api.get<Assignment>(`/assignments/${assignmentId}`),
        // R-11: scoped=true enforces the assignment time period
        api.get<InteractionLog[]>(`/interactions?assignment_id=${assignmentId}&scoped=true`),
      ]);

      // Try to fetch existing declaration
      let declaration: Declaration | null = null;
      let entries: DeclarationEntry[] = [];
      try {
        const full = await api.get<{ declaration: Declaration; entries: DeclarationEntry[] }>(
          `/declarations/by-assignment/${assignmentId}`,
        );
        declaration = full.declaration;
        entries = full.entries;
      } catch {
        // 404 = no declaration yet — normal on first visit
      }

      dispatch({ type: 'LOADED', assignment, declaration, entries, logs });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : 'Load failed' });
    }
  }, [assignmentId]);

  useEffect(() => { void load(); }, [load]);

  // R-8: derive logged tools and counts for IntegrityMonitor
  // These MUST be declared before any conditional returns (Rules of Hooks)
  const loggedTools = useMemo(() => [...new Set(state.logs.map((l) => l.tool_name))], [state.logs]);
  const getDeclaredCount = useCallback(() => state.entries.length, [state.entries]);
  const getEntryContents = useCallback(() => state.entries.map((e) => e.content), [state.entries]);

  // R-8: mount IntegrityMonitor unconditionally (only active when declaration exists)
  useIntegrityMonitor({
    declarationId: state.declaration?.id ?? '__none__',
    loggedTools,
    totalLoggedCount: state.logs.length,
    getDeclaredCount,
    getEntryContents,
  });

  // Create declaration + generate draft
  const handleGenerateDraft = async () => {
    dispatch({ type: 'GENERATING' });
    try {
      // Create declaration (R-9(a): server creates initial_open snapshot)
      const { declarationId } = await api.post<{ declarationId: string }>('/declarations', {
        assignment_id: assignmentId,
        student_id: studentId,
      });

      const declaration = await api.get<Declaration>(`/declarations/${declarationId}`)
        .then((full) => (full as unknown as { declaration: Declaration }).declaration);

      dispatch({ type: 'SET_DECLARATION', declaration });
      onDeclarationCreated?.(declarationId);

      // R-1: generate auto-generated entries from scoped logs
      const newEntries: DeclarationEntry[] = [];
      for (const log of state.logs) {
        const fields = buildEntriesFromLog(log);
        for (const field of fields) {
          const { entryId } = await api.post<{ entryId: string }>(
            `/declarations/${declarationId}/entries`,
            { ...field, origin: 'auto-generated' },
          );
          newEntries.push({
            id: entryId,
            declaration_id: declarationId,
            interaction_log_id: field.interaction_log_id,
            field_name: field.field_name,
            content: field.content,
            origin: 'auto-generated',
            previous_content: null,
            diff_delta: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      dispatch({ type: 'ENTRIES_GENERATED', entries: newEntries });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : 'Generation failed' });
    }
  };

  // R-13: Draft regeneration — merges new logs, preserves edits, creates pre/post snapshots
  const handleRegenerateDraft = async (declarationId: string) => {
    dispatch({ type: 'GENERATING' });
    try {
      await api.post(`/declarations/${declarationId}/regenerate`, {});
      // Reload entries after regeneration
      const full = await api.get<{ declaration: Declaration; entries: DeclarationEntry[] }>(
        `/declarations/by-assignment/${assignmentId}`,
      );
      dispatch({ type: 'ENTRIES_GENERATED', entries: full.entries });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : 'Regeneration failed' });
    }
  };

  if (state.status === 'loading') {
    return <p aria-busy="true">Loading declaration data…</p>;
  }

  if (state.status === 'error') {
    return (
      <p role="alert" style={{ color: 'var(--color-error-text)' }}>
        Error: {state.error}
      </p>
    );
  }

  const { assignment, declaration, entries, logs } = state;

  return (
    <section aria-labelledby="draft-editor-heading">
      <h2 id="draft-editor-heading">
        AI Usage Declaration Draft
        {assignment && (
          <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginLeft: '0.75rem' }}>
            — {assignment.title}
          </span>
        )}
      </h2>

      {assignment && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <strong>Course:</strong> {assignment.course_name} &nbsp;|&nbsp;
          <strong>Period:</strong>{' '}
          {new Date(assignment.period_start).toLocaleDateString()} –{' '}
          {new Date(assignment.period_end).toLocaleDateString()}
          {/* R-11: show locked status */}
          {declaration?.time_period_locked_at && (
            <span
              style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
              title="The time period for this declaration is locked"
            >
              (period locked)
            </span>
          )}
        </p>
      )}

      {/* R-12: Unassigned interactions queue — must be resolved before generating */}
      <UnassignedQueue onResolved={() => { /* force re-render is handled by parent */ }} />

      {!declaration ? (
        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            {logs.length === 0
              ? 'No AI interaction logs found for this assignment period.'
              : `Found ${logs.length} AI interaction log${logs.length === 1 ? '' : 's'} for this assignment. Generate a draft declaration to get started.`}
          </p>
          <button
            type="button"
            onClick={() => void handleGenerateDraft()}
            disabled={state.isGenerating || logs.length === 0}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-primary)',
              color: 'var(--color-primary-text)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: state.isGenerating || logs.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {state.isGenerating ? 'Generating draft…' : 'Generate Draft'}
          </button>
        </div>
      ) : (
        <>
          {/* R-8: WarningBanner — advisory only, never blocks */}
          <WarningBanner />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} based on {logs.length} logged interactions.
              You may edit or delete any entry below.
            </p>
            {/* R-13: Regenerate draft button */}
            {declaration && (
              <button
                type="button"
                onClick={() => void handleRegenerateDraft(declaration.id)}
                disabled={state.isGenerating}
                style={{
                  padding: '0.3rem 0.85rem',
                  fontSize: '0.8rem',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.25rem',
                  cursor: state.isGenerating ? 'wait' : 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
                title="Merge any newly available interaction logs into the draft, preserving existing edits"
              >
                {state.isGenerating ? 'Regenerating…' : '↺ Regenerate Draft'}
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No entries in draft.</p>
          ) : (
            <div role="list" aria-label="Declaration entries">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  declarationId={declaration.id}
                  onUpdated={(updated) => dispatch({ type: 'ENTRY_UPDATED', entry: updated })}
                  onDeleted={(id) => dispatch({ type: 'ENTRY_DELETED', entryId: id })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default DraftEditorModule;
