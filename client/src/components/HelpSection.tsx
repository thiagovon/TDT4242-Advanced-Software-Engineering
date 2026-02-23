// HelpSection — R-6, R-7
// Loads help content from guidance.json (configurable without code deployment).
// R-7: accessible with keyboard navigation, focus management, ARIA labels.

import React, { useState } from 'react';
import { useGuidance } from '../hooks/useGuidance';

// R-6, R-7: HelpSection
const HelpSection: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { helpSection } = useGuidance();

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="help-panel"
        style={{
          padding: '0.3rem 0.85rem',
          fontSize: '0.8rem',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
      >
        {isOpen ? '✕ Close Help' : '? Help'}
      </button>

      {isOpen && (
        <div
          id="help-panel"
          role="dialog"
          aria-labelledby="help-panel-title"
          aria-modal="false"
          style={{
            position: 'absolute',
            right: 0,
            top: '2.25rem',
            width: '360px',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 50,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <h2
            id="help-panel-title"
            style={{ marginTop: 0, fontSize: '1rem' }}
          >
            {helpSection.title}
          </h2>
          {helpSection.sections.map((section) => (
            <details key={section.heading} style={{ marginBottom: '0.75rem' }}>
              <summary
                style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0' }}
              >
                {section.heading}
              </summary>
              <p style={{ margin: '0.35rem 0 0 0.5rem', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {section.body}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpSection;
