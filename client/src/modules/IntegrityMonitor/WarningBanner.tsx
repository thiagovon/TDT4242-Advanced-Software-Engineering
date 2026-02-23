// WarningBanner — R-8, R-7
// Renders active integrity warnings from WarningsContext.
// R-7: aria-live="assertive" because warnings are actionable alerts.
// R-8: warnings are advisory only — no blocking, only visible notice.

import React from 'react';
import { useWarnings } from '../../contexts/WarningsContext';
import type { WarningCondition } from '../../events/types';

const CONDITION_LABELS: Record<WarningCondition, string> = {
  entry_deleted: 'Entry deleted',
  scope_reduced: 'Scope reduction detected',
  coverage_low: 'Low coverage',
  tool_missing: 'AI tool not mentioned',
};

// R-8, R-7: WarningBanner
const WarningBanner: React.FC = () => {
  const { warnings } = useWarnings();

  if (warnings.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Integrity warnings"
      aria-live="assertive"  // R-7: assertive — warnings need immediate attention
      aria-atomic="false"    // announce each warning individually
      style={{
        background: 'var(--color-warning-bg)',
        border: '1px solid var(--color-warning-border)',
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--color-warning-text)',
        }}
      >
        ⚠ {warnings.length} Integrity Warning{warnings.length > 1 ? 's' : ''}
      </h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-warning-text)' }}>
        These warnings are advisory. You may still submit, but must acknowledge each one during the
        confirmation step.
      </p>
      <ul style={{ margin: 0, padding: '0 0 0 1.25rem' }}>
        {warnings.map((w) => (
          <li
            key={w.id}
            style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)', marginBottom: '0.35rem' }}
          >
            <strong>{CONDITION_LABELS[w.condition]}:</strong> {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WarningBanner;
