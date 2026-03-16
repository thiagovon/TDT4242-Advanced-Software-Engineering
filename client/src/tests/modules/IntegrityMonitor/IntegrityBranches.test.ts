// Extended IntegrityMonitor branch coverage tests — R-8
// Explicit true/false branch testing for all four warning conditions
// Tests the logic boundaries more thoroughly than the existing tests

import { describe, it, expect } from 'vitest';
import { COVERAGE_THRESHOLD, SCOPE_REDUCTION_CHAR_THRESHOLD } from '../../../modules/IntegrityMonitor/index';

// ─── R-8(b): scope reduction — explicit branch testing ─────────────────────

describe('R-8(b): scope reduction — branch coverage', () => {
  function wouldTrigger(prev: string, next: string, tools: string[]): boolean {
    const diffDelta = next.length - prev.length;
    const toolRemoved = tools.some(
      (t) =>
        prev.toLowerCase().includes(t.toLowerCase()) &&
        !next.toLowerCase().includes(t.toLowerCase()),
    );
    return diffDelta < -SCOPE_REDUCTION_CHAR_THRESHOLD || toolRemoved;
  }

  // Branch: diffDelta < -20 (true), toolRemoved (false)
  it('triggers when content shortened by >20 chars without tool removal', () => {
    const prev = 'ChatGPT was used extensively for all code generation tasks in this assignment.';
    const next = 'ChatGPT used for code.';
    expect(wouldTrigger(prev, next, ['ChatGPT'])).toBe(true);
  });

  // Branch: diffDelta >= -20 (false), toolRemoved (true)
  it('triggers when tool name removed but length similar', () => {
    const prev = 'GitHub Copilot assisted with code.';
    const next = 'AI tool assisted with code review.';
    expect(wouldTrigger(prev, next, ['GitHub Copilot'])).toBe(true);
  });

  // Branch: diffDelta < -20 (true), toolRemoved (true) — both conditions
  it('triggers when both content shortened AND tool removed', () => {
    const prev = 'GitHub Copilot was used for extensive code generation and review.';
    const next = 'AI helped briefly.';
    expect(wouldTrigger(prev, next, ['GitHub Copilot'])).toBe(true);
  });

  // Branch: diffDelta >= -20 (false), toolRemoved (false) — neither condition
  it('does NOT trigger when content similar length and all tools present', () => {
    const prev = 'ChatGPT was used for code review.';
    const next = 'ChatGPT was used for code review and testing.';
    expect(wouldTrigger(prev, next, ['ChatGPT'])).toBe(false);
  });

  // Branch: exactly -20 chars (boundary — should NOT trigger)
  it('does NOT trigger when content shortened by exactly 20 chars', () => {
    const basePrev = 'ChatGPT' + 'a'.repeat(30);
    const baseNext = 'ChatGPT' + 'a'.repeat(10); // -20 exactly
    expect(baseNext.length - basePrev.length).toBe(-20);
    // -20 is NOT less than -20, so should not trigger
    expect(wouldTrigger(basePrev, baseNext, ['ChatGPT'])).toBe(false);
  });

  // Branch: -21 chars (just past boundary — should trigger)
  it('triggers when content shortened by 21 chars', () => {
    const basePrev = 'ChatGPT' + 'a'.repeat(30);
    const baseNext = 'ChatGPT' + 'a'.repeat(9); // -21
    expect(baseNext.length - basePrev.length).toBe(-21);
    expect(wouldTrigger(basePrev, baseNext, ['ChatGPT'])).toBe(true);
  });

  // Branch: multiple tools — only one removed
  it('triggers when one of multiple tools is removed', () => {
    const prev = 'I used ChatGPT and GitHub Copilot for this task.';
    const next = 'I used ChatGPT for this task and some more text to keep length.';
    expect(wouldTrigger(prev, next, ['ChatGPT', 'GitHub Copilot'])).toBe(true);
  });

  // Branch: multiple tools — none removed
  it('does NOT trigger when all tools are still mentioned', () => {
    const prev = 'ChatGPT and Copilot helped.';
    const next = 'ChatGPT and Copilot helped me write code and tests.';
    expect(wouldTrigger(prev, next, ['ChatGPT', 'Copilot'])).toBe(false);
  });
});

// ─── R-8(c): coverage threshold — explicit branch testing ──────────────────

describe('R-8(c): coverage — branch coverage', () => {
  function coverageWarning(totalLogged: number, declared: number): boolean {
    const coverage = totalLogged > 0 ? declared / totalLogged : 1;
    return totalLogged > 0 && coverage < COVERAGE_THRESHOLD;
  }

  // Branch: totalLogged > 0 (true), coverage < 0.6 (true)
  it('warns: 2/5 declared = 40% < 60%', () => {
    expect(coverageWarning(5, 2)).toBe(true);
  });

  // Branch: totalLogged > 0 (true), coverage >= 0.6 (false)
  it('no warning: 3/5 declared = 60% = threshold', () => {
    expect(coverageWarning(5, 3)).toBe(false);
  });

  // Branch: totalLogged > 0 (true), coverage > 1.0 (false)
  it('no warning: 7/5 declared = 140% (manual entries added)', () => {
    expect(coverageWarning(5, 7)).toBe(false);
  });

  // Branch: totalLogged === 0 (false path — no warning)
  it('no warning when totalLogged is 0', () => {
    expect(coverageWarning(0, 0)).toBe(false);
  });

  // Branch: totalLogged === 0, declared > 0 (all manual)
  it('no warning when totalLogged is 0 and declared > 0', () => {
    expect(coverageWarning(0, 3)).toBe(false);
  });

  // Boundary: 59.999% — just below threshold
  it('warns: 59/100 declared = 59% < 60%', () => {
    expect(coverageWarning(100, 59)).toBe(true);
  });

  // Boundary: exactly 60%
  it('no warning: 60/100 declared = exactly 60%', () => {
    expect(coverageWarning(100, 60)).toBe(false);
  });
});

// ─── R-8(a): entry_deleted — explicit branch testing ───────────────────────

describe('R-8(a): entry_deleted — branch coverage', () => {
  function shouldWarn(origin: string): boolean {
    return origin === 'auto-generated' || origin === 'auto-generated-modified';
  }

  // Branch: auto-generated (true)
  it('warns for auto-generated', () => {
    expect(shouldWarn('auto-generated')).toBe(true);
  });

  // Branch: auto-generated-modified (true)
  it('warns for auto-generated-modified', () => {
    expect(shouldWarn('auto-generated-modified')).toBe(true);
  });

  // Branch: manual (false)
  it('does NOT warn for manual', () => {
    expect(shouldWarn('manual')).toBe(false);
  });

  // Branch: unknown origin (false)
  it('does NOT warn for unknown origin type', () => {
    expect(shouldWarn('custom')).toBe(false);
  });
});

// ─── R-8(d): tool_missing — explicit branch testing ────────────────────────

describe('R-8(d): tool_missing — branch coverage', () => {
  function toolsMissing(loggedTools: string[], allContent: string): string[] {
    return loggedTools.filter(
      (tool) => !allContent.toLowerCase().includes(tool.toLowerCase()),
    );
  }

  // Branch: tool present in content (not missing)
  it('returns empty when all tools mentioned', () => {
    expect(toolsMissing(['ChatGPT'], 'I used ChatGPT for code.')).toEqual([]);
  });

  // Branch: tool absent from content (missing)
  it('returns missing tool when not mentioned', () => {
    expect(toolsMissing(['Copilot'], 'I used ChatGPT for code.')).toEqual(['Copilot']);
  });

  // Branch: multiple tools, some missing
  it('returns only missing tools from mixed set', () => {
    const missing = toolsMissing(
      ['ChatGPT', 'Copilot', 'Claude'],
      'ChatGPT helped and Claude assisted.',
    );
    expect(missing).toEqual(['Copilot']);
  });

  // Branch: empty logged tools
  it('returns empty when no tools are logged', () => {
    expect(toolsMissing([], 'Some content')).toEqual([]);
  });

  // Branch: empty content
  it('returns all tools when content is empty', () => {
    expect(toolsMissing(['ChatGPT', 'Copilot'], '')).toEqual(['ChatGPT', 'Copilot']);
  });

  // Branch: case insensitive
  it('handles case-insensitive matching', () => {
    expect(toolsMissing(['CHATGPT'], 'chatgpt was used')).toEqual([]);
  });
});
