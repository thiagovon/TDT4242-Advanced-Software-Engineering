// Additional tests for Reflection validation — FR-30
// UT-05: countWords with valid 25+ word text
// UT-06: validatePrompt with empty string
// UT-07: hasRepetition with repeated n-grams
// UT-08: validateReflection with one valid and one empty prompt
// Edge cases: exactly 25 words, repetition with enough words, boundary conditions

import { describe, it, expect } from 'vitest';
import {
  countWords,
  hasRepetition,
  validatePrompt,
  validateReflection,
  MIN_WORDS,
} from '../../../modules/ReflectionModule/validation';

describe('FR-30: countWords edge cases', () => {
  // UT-05: valid text with >= 25 words
  it('UT-05: returns correct count for a 25+ word reflection', () => {
    const text =
      'This is a valid reflection with enough words to pass the minimum threshold of twenty five words for the prompt validation requirement in the system';
    const count = countWords(text);
    expect(count).toBeGreaterThanOrEqual(25);
    expect(count).toBe(25);
  });

  it('counts exactly 25 words at boundary', () => {
    const words = Array.from({ length: 25 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    expect(countWords(text)).toBe(25);
  });

  it('counts 24 words as below minimum', () => {
    const words = Array.from({ length: 24 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    expect(countWords(text)).toBe(24);
    expect(countWords(text)).toBeLessThan(MIN_WORDS);
  });

  it('handles tabs and newlines as word separators', () => {
    expect(countWords('hello\tworld\nnew\rline')).toBe(4);
  });

  it('handles multiple consecutive spaces', () => {
    expect(countWords('one    two     three')).toBe(3);
  });
});

describe('FR-30: hasRepetition edge cases', () => {
  // UT-07: n-gram repetition
  it('UT-07: detects "I used AI" repeated multiple times', () => {
    const text = 'I used AI I used AI I used AI and nothing else';
    expect(hasRepetition(text)).toBe(true);
  });

  it('does not flag text below minimum n-gram repetition length', () => {
    expect(hasRepetition('one two three four five')).toBe(false);
  });

  it('does not flag unique 25-word text', () => {
    const text =
      'The artificial intelligence tools significantly impacted my approach to solving complex algorithmic problems during this particular university assignment by providing immediate detailed feedback on my implementation choices and coding patterns';
    expect(hasRepetition(text)).toBe(false);
    expect(countWords(text)).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  it('detects subtle repetition within longer text', () => {
    const text =
      'AI helped me understand the algorithm. Then AI helped me understand the edge cases. And AI helped me understand the complexity.';
    expect(hasRepetition(text)).toBe(true);
  });
});

describe('FR-30: validatePrompt edge cases', () => {
  // UT-06: empty string
  it('UT-06: returns invalid with word count error for empty string', () => {
    const result = validatePrompt('');
    expect(result.isValid).toBe(false);
    expect(result.meetsMinWords).toBe(false);
    expect(result.wordCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/25 words/);
  });

  it('returns invalid for whitespace-only input', () => {
    const result = validatePrompt('   \t  \n  ');
    expect(result.isValid).toBe(false);
    expect(result.wordCount).toBe(0);
  });

  it('returns valid for exactly 25 unique words', () => {
    const words = Array.from({ length: 25 }, (_, i) => `unique${i}`);
    const result = validatePrompt(words.join(' '));
    expect(result.isValid).toBe(true);
    expect(result.meetsMinWords).toBe(true);
    expect(result.wordCount).toBe(25);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when word count is met but repetition is detected', () => {
    const phrase = 'AI helped me with code review. ';
    const text = phrase.repeat(6);
    const result = validatePrompt(text);
    expect(result.wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
    expect(result.hasRepetition).toBe(true);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Your response appears to contain repeated phrases. Please write a genuine reflection.',
    );
  });
});

describe('FR-30: validateReflection with mixed validity', () => {
  const validText =
    'I used ChatGPT extensively to help me understand the core concepts of evolutionary algorithms by asking targeted questions about fitness functions mutation operators and selection strategies';

  // UT-08: prompt1 valid, prompt2 empty
  it('UT-08: returns invalid when prompt1 is valid but prompt2 is empty', () => {
    const result = validateReflection(validText, '');
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(true);
    expect(result.prompt2.isValid).toBe(false);
    expect(result.prompt2.wordCount).toBe(0);
  });

  // Mirror case: prompt1 empty, prompt2 valid
  it('returns invalid when prompt1 is empty but prompt2 is valid', () => {
    const result = validateReflection('', validText);
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(false);
    expect(result.prompt2.isValid).toBe(true);
  });

  // Both empty
  it('returns invalid with both prompts failing when both are empty', () => {
    const result = validateReflection('', '');
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(false);
    expect(result.prompt2.isValid).toBe(false);
  });

  // Both valid
  it('returns valid when both prompts have 25+ unique words', () => {
    const result = validateReflection(validText, validText);
    expect(result.isValid).toBe(true);
    expect(result.prompt1.isValid).toBe(true);
    expect(result.prompt2.isValid).toBe(true);
  });

  // One has repetition
  it('returns invalid when one prompt has repetition', () => {
    const repetitiveText = 'AI helped me with code. '.repeat(6);
    const result = validateReflection(validText, repetitiveText);
    expect(result.isValid).toBe(false);
    expect(result.prompt1.isValid).toBe(true);
    expect(result.prompt2.isValid).toBe(false);
    expect(result.prompt2.hasRepetition).toBe(true);
  });
});
