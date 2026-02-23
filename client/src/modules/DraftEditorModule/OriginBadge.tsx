// OriginBadge — R-1
// Renders the persistent origin metadata tag for a declaration entry.
// Badge NEVER disappears when an auto-generated field is edited;
// it changes text from "Auto-generated" to "Auto-generated (edited)".

import React from 'react';
import type { OriginType } from '../../events/types';

interface Props {
  origin: OriginType;
}

const BADGE_CONFIG: Record<
  OriginType,
  { label: string; bgVar: string; textVar: string; ariaLabel: string }
> = {
  'auto-generated': {
    label: 'Auto-generated',
    bgVar: 'var(--badge-auto-bg)',
    textVar: 'var(--badge-auto-text)',
    ariaLabel: 'This field was auto-generated from your AI interaction logs',
  },
  'auto-generated-modified': {
    label: 'Auto-generated (edited)',
    bgVar: 'var(--badge-auto-modified-bg)',
    textVar: 'var(--badge-auto-modified-text)',
    ariaLabel: 'This field was auto-generated and then edited by you',
  },
  manual: {
    label: 'Manually added',
    bgVar: 'var(--badge-manual-bg)',
    textVar: 'var(--badge-manual-text)',
    ariaLabel: 'This field was manually added by you',
  },
};

// R-1: OriginBadge
const OriginBadge: React.FC<Props> = ({ origin }) => {
  const config = BADGE_CONFIG[origin];
  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      title={config.ariaLabel}
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: config.bgVar,
        color: config.textVar,
        textTransform: 'uppercase',
        verticalAlign: 'middle',
        marginLeft: '0.5rem',
      }}
    >
      {config.label}
    </span>
  );
};

export default OriginBadge;
