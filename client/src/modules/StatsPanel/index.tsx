// StatsPanel — R-2
// Displays real-time, non-editable statistics derived from interaction logs.
// Highlights discrepancies between logged and declared interactions.
//
// R-2: shows tools used, interaction count, categories, time span
// R-2: declared vs logged count with 60% threshold highlight
// R-2: updates in real time via event bus subscription
// R-7: aria-live="polite" for stat updates

import React, { useEffect, useState, useCallback } from 'react';
import type { InteractionLog, DeclarationEntry } from '../../types/api';
import { eventBus } from '../../events/eventBus';
import { api } from '../../hooks/useApi';

// R-2: 60% threshold — matches R-8(c) coverage_low condition
const COVERAGE_THRESHOLD = 0.6;

interface Props {
  assignmentId: string;
  entries: DeclarationEntry[];
  manualEntryCount: number;
}

interface Stats {
  totalLogged: number;
  tools: string[];
  categories: Record<string, number>;
  periodStart: string | null;
  periodEnd: string | null;
}

function computeStats(logs: InteractionLog[]): Stats {
  const tools = [...new Set(logs.map((l) => l.tool_name))];
  const categories: Record<string, number> = {};
  for (const log of logs) {
    categories[log.category] = (categories[log.category] ?? 0) + 1;
  }
  const dates = logs.map((l) => l.logged_at).sort();
  return {
    totalLogged: logs.length,
    tools,
    categories,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}

// R-2: StatsPanel
const StatsPanel: React.FC<Props> = ({ assignmentId, entries, manualEntryCount }) => {
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      // R-11: scoped to assignment time period
      const data = await api.get<InteractionLog[]>(
        `/interactions?assignment_id=${assignmentId}&scoped=true`,
      );
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  // R-2: re-render when entries change via event bus
  useEffect(() => {
    const refresh = () => { /* state is lifted via props — re-render is automatic */ };
    eventBus.on('ENTRY_DELETED', refresh);
    eventBus.on('ENTRY_MODIFIED', refresh);
    eventBus.on('MANUAL_ENTRY_ADDED', refresh);
    eventBus.on('MANUAL_ENTRY_REMOVED', refresh);
    return () => {
      eventBus.off('ENTRY_DELETED', refresh);
      eventBus.off('ENTRY_MODIFIED', refresh);
      eventBus.off('MANUAL_ENTRY_ADDED', refresh);
      eventBus.off('MANUAL_ENTRY_REMOVED', refresh);
    };
  }, []);

  const stats = computeStats(logs);

  // R-2: declared count = auto-generated (non-deleted) + manual entries
  // Each log entry maps to 1 declaration entry
  const declaredCount = entries.length + manualEntryCount;
  const coverage = stats.totalLogged > 0 ? declaredCount / stats.totalLogged : 1;
  // R-2: highlight when declared < 60% of logged
  const isDiscrepancy = stats.totalLogged > 0 && coverage < COVERAGE_THRESHOLD;

  if (loading) {
    return (
      <aside aria-labelledby="stats-panel-heading" aria-live="polite" aria-busy="true">
        <p>Loading statistics…</p>
      </aside>
    );
  }

  return (
    <aside
      aria-labelledby="stats-panel-heading"
      aria-live="polite"  // R-7: polite — non-urgent real-time updates
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '0.5rem',
        padding: '1.25rem',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: '1rem',
        alignSelf: 'start',
      }}
    >
      <h2
        id="stats-panel-heading"
        style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1rem' }}
      >
        AI Usage Statistics
      </h2>

      {/* Coverage summary — R-2 */}
      <div
        role="region"
        aria-label="Interaction coverage"
        style={{
          padding: '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          background: isDiscrepancy
            ? 'var(--color-discrepancy-bg)'
            : 'var(--color-surface)',
          border: isDiscrepancy
            ? '1px solid var(--color-warning-border)'
            : '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Logged interactions
          </span>
          <strong>{stats.totalLogged}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Declared
          </span>
          <strong
            style={{ color: isDiscrepancy ? 'var(--color-discrepancy-text)' : 'inherit' }}
          >
            {declaredCount}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Coverage
          </span>
          <strong
            style={{ color: isDiscrepancy ? 'var(--color-discrepancy-text)' : 'inherit' }}
          >
            {stats.totalLogged > 0 ? Math.round(coverage * 100) : 100}%
          </strong>
        </div>

        {/* R-2: discrepancy highlight */}
        {isDiscrepancy && (
          <p
            role="alert"
            aria-live="assertive"  // R-7: assertive because this is a warning
            style={{
              marginTop: '0.5rem',
              marginBottom: 0,
              fontSize: '0.75rem',
              color: 'var(--color-discrepancy-text)',
              fontWeight: 600,
            }}
          >
            ⚠ Your declaration covers {Math.round(coverage * 100)}% of logged interactions
            (minimum recommended: {COVERAGE_THRESHOLD * 100}%).
          </p>
        )}
      </div>

      {/* Tools used — R-2 */}
      {stats.tools.length > 0 && (
        <section aria-labelledby="stats-tools-heading">
          <h3
            id="stats-tools-heading"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}
          >
            AI Tools Used
          </h3>
          <ul
            style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}
            aria-label="AI tools detected in logs"
          >
            {stats.tools.map((tool) => (
              <li
                key={tool}
                style={{
                  padding: '0.2rem 0.6rem',
                  background: 'var(--badge-auto-bg)',
                  color: 'var(--badge-auto-text)',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {tool}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Categories — R-2 */}
      {Object.keys(stats.categories).length > 0 && (
        <section aria-labelledby="stats-categories-heading" style={{ marginTop: '1rem' }}>
          <h3
            id="stats-categories-heading"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}
          >
            Interaction Categories
          </h3>
          <dl style={{ margin: 0 }}>
            {Object.entries(stats.categories).map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                <dt style={{ color: 'var(--color-text-secondary)' }}>{cat}</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Time span — R-2 */}
      {stats.periodStart && (
        <section aria-labelledby="stats-timespan-heading" style={{ marginTop: '1rem' }}>
          <h3
            id="stats-timespan-heading"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}
          >
            Activity Period
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {new Date(stats.periodStart).toLocaleDateString()} –{' '}
            {stats.periodEnd ? new Date(stats.periodEnd).toLocaleDateString() : '…'}
          </p>
        </section>
      )}
    </aside>
  );
};

export default StatsPanel;
