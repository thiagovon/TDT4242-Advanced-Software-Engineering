// UnassignedQueue — R-12
// Displays the unassigned interactions queue that the student must resolve
// before generating a declaration.
// R-12: The system does NOT silently attribute ambiguous interactions.
// The student must explicitly assign each one to an assignment.

import React, { useEffect, useState } from 'react';
import type { InteractionLog } from '../../types/api';
import { api } from '../../hooks/useApi';
import { eventBus } from '../../events/eventBus';

interface Assignment {
  id: string;
  title: string;
}

interface Props {
  onResolved?: () => void;
}

// R-12: UnassignedQueue
const UnassignedQueue: React.FC<Props> = ({ onResolved }) => {
  const [unassigned, setUnassigned] = useState<InteractionLog[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [logs, assigns] = await Promise.all([
        api.get<InteractionLog[]>('/interactions/unassigned'),
        api.get<Assignment[]>('/assignments'),
      ]);
      setUnassigned(logs);
      setAssignments(assigns);
      setLoading(false);
    })();
  }, []);

  const handleAssign = async (interactionId: string) => {
    const assignmentId = selections[interactionId];
    if (!assignmentId) return;
    setSaving((s) => ({ ...s, [interactionId]: true }));
    try {
      await api.post(`/interactions/${interactionId}/assign`, { assignment_id: assignmentId });
      // R-12: emit event
      eventBus.emit('INTERACTION_ASSIGNED', {
        interactionId,
        assignmentId,
        assignedAt: new Date().toISOString(),
      });
      setUnassigned((prev) => prev.filter((l) => l.id !== interactionId));
      // If all resolved, notify parent
      if (unassigned.length === 1) onResolved?.();
    } finally {
      setSaving((s) => ({ ...s, [interactionId]: false }));
    }
  };

  if (loading) return <p aria-busy="true">Checking for unassigned interactions…</p>;
  if (unassigned.length === 0) return null;

  return (
    <div
      role="region"
      aria-labelledby="unassigned-queue-heading"
      style={{
        border: '1px solid var(--color-warning-border)',
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        background: 'var(--color-warning-bg)',
      }}
    >
      <h3
        id="unassigned-queue-heading"
        style={{ marginTop: 0, color: 'var(--color-warning-text)' }}
      >
        ⚠ {unassigned.length} Unassigned AI Interaction{unassigned.length > 1 ? 's' : ''}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-warning-text)', marginBottom: '1rem' }}>
        These interactions occurred during a period when multiple assignments were active.
        Please assign each one to the correct assignment before generating your draft.
        <strong> The system will not guess.</strong>
      </p>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {unassigned.map((log) => (
          <li
            key={log.id}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: 'white',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              {new Date(log.logged_at).toLocaleDateString()} · {log.tool_name} · {log.category}
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>{log.description}</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                aria-label={`Assign interaction from ${log.tool_name} to an assignment`}
                value={selections[log.id] ?? ''}
                onChange={(e) => setSelections((s) => ({ ...s, [log.id]: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '0.35rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.25rem',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">— Select assignment —</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAssign(log.id)}
                disabled={!selections[log.id] || saving[log.id]}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  background: selections[log.id] ? 'var(--color-primary)' : 'var(--color-border)',
                  color: selections[log.id] ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: selections[log.id] && !saving[log.id] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {saving[log.id] ? 'Saving…' : 'Assign'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UnassignedQueue;
