// Tests for ReflectionModule validation — R-5
// Verifies user-facing behavior: word count enforcement, repetition detection.

import { describe, it, expect } from 'vitest';
import { validatePrompt, validateReflection, countWords, hasRepetition, MIN_WORDS } from '../validation';

describe('countWords', () => {
  it('counts single words correctly', () => {
    expect(countWords('hello')).toBe(1);
    expect(countWords('hello world')).toBe(2);
  });

  it('ignores extra whitespace', () => {
    expect(countWords('  hello   world  ')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('R-5: hasRepetition', () => {
  it('detects repeated 3-word phrases', () => {
    const text = 'the quick brown fox jumped over the quick brown fox jumped over';
    expect(hasRepetition(text)).toBe(true);
  });

  it('does NOT flag varied natural text', () => {
    const text =
      'I used ChatGPT to help me understand the backpropagation algorithm by asking targeted questions about gradient descent and weight updates. This helped me build intuition rather than just memorizing the formulas.';
    expect(hasRepetition(text)).toBe(false);
  });

  it('detects copy-pasted repeated content', () => {
    const sentence = 'AI helped me learn the concepts more deeply. ';
    const text = sentence.repeat(4);
    expect(hasRepetition(text)).toBe(true);
  });

  it('returns false for very short text', () => {
    expect(hasRepetition('hello world')).toBe(false);
  });
});

describe('R-5: validatePrompt', () => {
  it('fails when text has fewer than 25 words', () => {
    const result = validatePrompt('Short response.');
    expect(result.isValid).toBe(false);
    expect(result.meetsMinWords).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/25 words/);
  });

  it('passes for a genuine ≥25-word response', () => {
    const text =
      'I used ChatGPT extensively throughout this assignment to help me understand the core concepts of evolutionary algorithms. The tool helped me generate code examples and debug my fitness function. This saved time but also helped me learn the material more deeply than I would have otherwise.';
    expect(countWords(text)).toBeGreaterThanOrEqual(MIN_WORDS);
    const result = validatePrompt(text);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('R-5: fails when response contains repetition even if word count is met', () => {
    // Pad with repetition to reach 25 words
    const basePhrase = 'AI helped me with the work. ';
    const text = basePhrase.repeat(5);
    const result = validatePrompt(text);
    expect(result.isValid).toBe(false);
    expect(result.hasRepetition).toBe(true);
  });

  it('returns correct word count', () => {
    const text = 'one two three four five six seven eight nine ten';
    const result = validatePrompt(text);
    expect(result.wordCount).toBe(10);
  });
});

describe('R-5: validateReflection (both prompts)', () => {
  const validText =
    'I used ChatGPT extensively to help me understand the core concepts of evolutionary algorithms. The tool helped me generate code examples and debug my implementation effectively and thoroughly.';

  it('is valid only when both prompts pass', () => {
    const result = validateReflection(validText, validText);
    expect(result.isValid).toBe(true);
    expect(result.prompt1.isValid).toBe(true);
    expect(result.prompt2.isValid).toBe(true);
  });

  it('is invalid when prompt1 is too short', () => {
    const result = validateReflection('Too short.', validText);
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(false);
    expect(result.prompt2.isValid).toBe(true);
  });

  it('is invalid when prompt2 is too short', () => {
    const result = validateReflection(validText, 'Too short.');
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(true);
    expect(result.prompt2.isValid).toBe(false);
  });

  it('is invalid when both prompts fail', () => {
    const result = validateReflection('Short.', 'Also short.');
    expect(result.isValid).toBe(false);
  });
});
