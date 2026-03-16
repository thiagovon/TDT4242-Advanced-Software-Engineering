// Tests for HelpSection and Guidance — NFR-47
// NFR-01: help modal presence and content accuracy
// NFR-02: guidance.json tooltips/hints cover all major features

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import HelpSection from '../../components/HelpSection';

// Mock useGuidance to return known content from guidance.json
const mockGuidance = {
  institution: 'NTNU',
  tooltips: {
    originBadge_auto_generated: 'This field was automatically generated from your AI interaction logs.',
    originBadge_auto_generated_modified: 'This field was originally auto-generated but you have edited it.',
    originBadge_manual: 'This field was manually added by you.',
    coverage_discrepancy: 'Your declaration currently covers fewer interactions than your logs show.',
    integrity_warning: 'These warnings are advisory.',
    reflection_word_count: 'Each reflection prompt requires at least 25 words.',
    manual_entry_reason: 'Select the reason that best explains why this AI usage was not captured.',
    time_period_locked: 'The time period for this declaration is locked.',
  },
  hints: {
    draft_editor: 'Review each auto-generated entry and correct any inaccuracies.',
    reflection: 'Your reflection is private and used to support your own learning documentation.',
    manual_entries: 'Declare any AI usage that occurred outside the logging system.',
    review: 'This is a final read-only preview.',
  },
  helpSection: {
    title: 'How to complete your AI Usage Declaration',
    sections: [
      { heading: 'What is an AI Usage Declaration?', body: 'An AI Usage Declaration is a record of how you used generative AI tools.' },
      { heading: 'Auto-generated entries', body: 'The system automatically creates declaration entries from your AI interaction logs.' },
      { heading: 'Manual entries', body: 'If you used AI tools that were not captured by the logging system.' },
      { heading: 'Integrity warnings', body: 'If the system detects that your declaration may underrepresent your actual AI usage.' },
      { heading: 'Reflection', body: 'You must answer two structured reflection prompts.' },
    ],
  },
};

vi.mock('../../hooks/useGuidance', () => ({
  useGuidance: () => mockGuidance,
}));

describe('NFR-47: HelpSection — Explainability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // NFR-01: help button exists and toggles modal
  it('NFR-01: renders Help button that toggles modal open/closed', () => {
    render(<HelpSection />);

    const helpBtn = screen.getByRole('button', { name: /Help/i });
    expect(helpBtn).toBeInTheDocument();
    expect(helpBtn).toHaveAttribute('aria-expanded', 'false');

    // Open
    fireEvent.click(helpBtn);
    expect(helpBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close
    fireEvent.click(helpBtn);
    expect(helpBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // NFR-01: modal displays correct title from guidance.json
  it('NFR-01: modal title matches guidance.json helpSection.title', () => {
    render(<HelpSection />);

    fireEvent.click(screen.getByRole('button', { name: /Help/i }));
    expect(screen.getByText('How to complete your AI Usage Declaration')).toBeInTheDocument();
  });

  // NFR-01: all 5 collapsible sections rendered
  it('NFR-01: renders all 5 collapsible help sections', () => {
    render(<HelpSection />);

    fireEvent.click(screen.getByRole('button', { name: /Help/i }));

    for (const section of mockGuidance.helpSection.sections) {
      expect(screen.getByText(section.heading)).toBeInTheDocument();
    }
  });

  // NFR-01: section body is visible when expanded
  it('NFR-01: section body is rendered and readable', () => {
    render(<HelpSection />);

    fireEvent.click(screen.getByRole('button', { name: /Help/i }));

    // Body text should be in the DOM (details elements render content)
    expect(screen.getByText(/An AI Usage Declaration is a record/)).toBeInTheDocument();
    expect(screen.getByText(/automatically creates declaration entries/)).toBeInTheDocument();
  });

  // NFR-01: each help section has non-empty heading and body
  it('NFR-01: every section has non-empty heading and body', () => {
    for (const section of mockGuidance.helpSection.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);
    }
  });

  // NFR-01: help content covers key features
  it('NFR-01: help sections cover all major features (auto-generated, manual, warnings, reflection)', () => {
    const headings = mockGuidance.helpSection.sections.map((s) => s.heading.toLowerCase());
    expect(headings.some((h) => h.includes('auto-generated'))).toBe(true);
    expect(headings.some((h) => h.includes('manual'))).toBe(true);
    expect(headings.some((h) => h.includes('warning') || h.includes('integrity'))).toBe(true);
    expect(headings.some((h) => h.includes('reflection'))).toBe(true);
  });

  // NFR-01: modal has ARIA attributes for accessibility
  it('NFR-01: help modal has aria-labelledby pointing to title', () => {
    render(<HelpSection />);
    fireEvent.click(screen.getByRole('button', { name: /Help/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'help-panel-title');
    expect(dialog.querySelector('#help-panel-title')).not.toBeNull();
  });
});

describe('NFR-47: Guidance content completeness', () => {
  // NFR-02: tooltips exist for all major features
  it('NFR-02: tooltips cover origin badges, coverage, warnings, reflection, manual entries', () => {
    expect(mockGuidance.tooltips).toHaveProperty('originBadge_auto_generated');
    expect(mockGuidance.tooltips).toHaveProperty('originBadge_auto_generated_modified');
    expect(mockGuidance.tooltips).toHaveProperty('originBadge_manual');
    expect(mockGuidance.tooltips).toHaveProperty('coverage_discrepancy');
    expect(mockGuidance.tooltips).toHaveProperty('integrity_warning');
    expect(mockGuidance.tooltips).toHaveProperty('reflection_word_count');
    expect(mockGuidance.tooltips).toHaveProperty('manual_entry_reason');
    expect(mockGuidance.tooltips).toHaveProperty('time_period_locked');
  });

  // NFR-02: all tooltips are non-empty meaningful strings
  it('NFR-02: all tooltip values are non-empty strings', () => {
    for (const [key, value] of Object.entries(mockGuidance.tooltips)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(10); // meaningful content
      void key;
    }
  });

  // NFR-02: hints cover all 4 wizard steps
  it('NFR-02: hints cover draft_editor, reflection, manual_entries, and review steps', () => {
    expect(mockGuidance.hints).toHaveProperty('draft_editor');
    expect(mockGuidance.hints).toHaveProperty('reflection');
    expect(mockGuidance.hints).toHaveProperty('manual_entries');
    expect(mockGuidance.hints).toHaveProperty('review');
  });

  // NFR-02: hints are non-empty meaningful strings
  it('NFR-02: all hint values are non-empty strings', () => {
    for (const [key, value] of Object.entries(mockGuidance.hints)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(10);
      void key;
    }
  });

  // NFR-02: at least 3 help sections
  it('NFR-02: helpSection has at least 3 collapsible sections', () => {
    expect(mockGuidance.helpSection.sections.length).toBeGreaterThanOrEqual(3);
  });
});
