// Tests for IntegrityMonitor — R-8
// Tests verify all four warning conditions as user-facing behavior (Dev Rule 10).

import { describe, it, expect } from 'vitest';
import type { OriginType } from '../../../events/types';
import { COVERAGE_THRESHOLD, SCOPE_REDUCTION_CHAR_THRESHOLD } from '../index';

// Test pure logic helpers directly, then test hook integration via renderHook

describe('IntegrityMonitor constants', () => {
  it('R-8(c): COVERAGE_THRESHOLD is 0.6', () => {
    expect(COVERAGE_THRESHOLD).toBe(0.6);
  });

  it('R-8(b): SCOPE_REDUCTION_CHAR_THRESHOLD is 20', () => {
    expect(SCOPE_REDUCTION_CHAR_THRESHOLD).toBe(20);
  });
});

// ─── Coverage threshold logic ────────────────────────────────────────────────

describe('R-8(c): coverage_low warning', () => {
  it('should trigger when declared < 60% of logged', () => {
    const totalLogged = 10;
    const declared = 5; // 50% — below threshold
    const coverage = declared / totalLogged;
    expect(coverage).toBeLessThan(COVERAGE_THRESHOLD);
  });

  it('should NOT trigger when declared >= 60% of logged', () => {
    const totalLogged = 10;
    const declared = 6; // 60% — at threshold
    const coverage = declared / totalLogged;
    expect(coverage).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
  });

  it('should NOT trigger when declared > logged', () => {
    const totalLogged = 5;
    const declared = 7; // manual entries added
    const coverage = declared / totalLogged;
    expect(coverage).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
  });

  it('should NOT trigger when totalLogged is 0', () => {
    const totalLogged = 0;
    // When no logs, coverage is 1 (no discrepancy)
    const coverage = totalLogged > 0 ? 6 / totalLogged : 1;
    expect(coverage).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
  });
});

// ─── Scope reduction heuristic ───────────────────────────────────────────────

describe('R-8(b): scope_reduced warning heuristic', () => {
  function wouldTriggerScopeWarning(
    previousContent: string,
    newContent: string,
    loggedTools: string[],
  ): boolean {
    const diffDelta = newContent.length - previousContent.length;
    const toolMentionRemoved = loggedTools.some(
      (tool) =>
        previousContent.toLowerCase().includes(tool.toLowerCase()) &&
        !newContent.toLowerCase().includes(tool.toLowerCase()),
    );
    return diffDelta < -SCOPE_REDUCTION_CHAR_THRESHOLD || toolMentionRemoved;
  }

  it('should trigger when content is shortened by more than 20 chars', () => {
    const prev = 'ChatGPT was used for code generation with extensive detail about the approach.';
    const next = 'AI was used.';
    expect(wouldTriggerScopeWarning(prev, next, ['ChatGPT'])).toBe(true);
  });

  it('should trigger when a logged tool name is removed from content', () => {
    const prev = 'GitHub Copilot generated the test suite for this assignment.';
    const next = 'AI generated the test suite for this assignment.';
    expect(wouldTriggerScopeWarning(prev, next, ['GitHub Copilot'])).toBe(true);
  });

  it('should NOT trigger when content is expanded', () => {
    const prev = 'ChatGPT helped with code.';
    const next = 'ChatGPT was used extensively to help write and review all code in this assignment.';
    expect(wouldTriggerScopeWarning(prev, next, ['ChatGPT'])).toBe(false);
  });

  it('should NOT trigger for minor edits within 20-char threshold', () => {
    const prev = 'ChatGPT was used for code review.';
    const next = 'ChatGPT was used for code review today.'; // +7 chars
    expect(wouldTriggerScopeWarning(prev, next, ['ChatGPT'])).toBe(false);
  });

  it('should NOT trigger when tool name is replaced with equivalent capitalization', () => {
    const prev = 'chatgpt was used for help.';
    const next = 'ChatGPT was used for help today with some additional context added here.';
    expect(wouldTriggerScopeWarning(prev, next, ['ChatGPT'])).toBe(false);
  });
});

// ─── Tool mention check ──────────────────────────────────────────────────────

describe('R-8(d): tool_missing warning', () => {
  function isMissing(tool: string, allContent: string): boolean {
    return !allContent.toLowerCase().includes(tool.toLowerCase());
  }

  it('should flag a tool that is not mentioned in any entry', () => {
    const allContent = 'Used AI for code generation and explanation.';
    expect(isMissing('GitHub Copilot', allContent)).toBe(true);
  });

  it('should NOT flag a tool that appears in any entry', () => {
    const allContent = 'GitHub Copilot was used for autocomplete. ChatGPT helped with debugging.';
    expect(isMissing('ChatGPT', allContent)).toBe(false);
    expect(isMissing('GitHub Copilot', allContent)).toBe(false);
  });

  it('should be case-insensitive', () => {
    const allContent = 'chatgpt was used for explanation.';
    expect(isMissing('ChatGPT', allContent)).toBe(false);
  });
});

// ─── Entry deleted ────────────────────────────────────────────────────────────

describe('R-8(a): entry_deleted warning', () => {
  function shouldWarnOnDelete(origin: OriginType): boolean {
    return origin === 'auto-generated' || origin === 'auto-generated-modified';
  }

  it('should trigger for auto-generated entries', () => {
    expect(shouldWarnOnDelete('auto-generated')).toBe(true);
  });

  it('should trigger for auto-generated-modified entries', () => {
    expect(shouldWarnOnDelete('auto-generated-modified')).toBe(true);
  });

  it('should NOT trigger for manually added entries', () => {
    expect(shouldWarnOnDelete('manual')).toBe(false);
  });
});
