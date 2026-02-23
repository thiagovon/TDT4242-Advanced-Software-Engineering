// Tests for ManualUsageModule — R-10
// Verifies user-facing behavior: required fields, minimum word count, predefined reasons.

import { describe, it, expect } from 'vitest';
import { REASON_OPTIONS, MANUAL_DESCRIPTION_MIN_WORDS } from '../index';

describe('R-10: ManualUsageModule constants', () => {
  it('requires description to be at least 15 words', () => {
    expect(MANUAL_DESCRIPTION_MIN_WORDS).toBe(15);
  });

  it('has exactly the four required reason options', () => {
    const values = REASON_OPTIONS.map((r) => r.value);
    expect(values).toContain('external_device');
    expect(values).toContain('unintegrated_tool');
    expect(values).toContain('before_logging');
    expect(values).toContain('other');
    expect(REASON_OPTIONS).toHaveLength(4);
  });
});

describe('R-10: Description minimum word count validation', () => {
  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function isDescriptionValid(text: string): boolean {
    return countWords(text) >= MANUAL_DESCRIPTION_MIN_WORDS;
  }

  it('rejects descriptions with fewer than 15 words', () => {
    expect(isDescriptionValid('Used ChatGPT to help code.')).toBe(false);
  });

  it('accepts descriptions with exactly 15 words', () => {
    const text = 'I used ChatGPT to help generate boilerplate code for my neural network training loop implementation.';
    expect(countWords(text)).toBeGreaterThanOrEqual(MANUAL_DESCRIPTION_MIN_WORDS);
    expect(isDescriptionValid(text)).toBe(true);
  });

  it('accepts descriptions with more than 15 words', () => {
    const text = 'I used GitHub Copilot on my personal laptop to help me write repetitive boilerplate code for configuring the training pipeline. The tool was not integrated with AIGuidebook.';
    expect(isDescriptionValid(text)).toBe(true);
  });
});

describe('R-10: Reason options cover all required cases', () => {
  it('includes "Used on a personal/external device"', () => {
    const opt = REASON_OPTIONS.find((r) => r.value === 'external_device');
    expect(opt).toBeDefined();
    expect(opt!.label).toMatch(/personal.*external device/i);
  });

  it('includes "Used a tool not integrated with AIGuidebook"', () => {
    const opt = REASON_OPTIONS.find((r) => r.value === 'unintegrated_tool');
    expect(opt).toBeDefined();
    expect(opt!.label).toMatch(/not integrated/i);
  });

  it('includes "Used before the logging period"', () => {
    const opt = REASON_OPTIONS.find((r) => r.value === 'before_logging');
    expect(opt).toBeDefined();
    expect(opt!.label).toMatch(/before the logging period/i);
  });

  it('includes "Other — please specify"', () => {
    const opt = REASON_OPTIONS.find((r) => r.value === 'other');
    expect(opt).toBeDefined();
    expect(opt!.label).toMatch(/other.*please specify/i);
  });
});
