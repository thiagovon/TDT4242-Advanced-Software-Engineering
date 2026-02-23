// Reflection validation logic — R-5
// Used by both client (immediate feedback) and is mirrored server-side (submission gate).
//
// Rules:
//   R-5: ≥25 words per prompt
//   R-5: Repetition-detection heuristic (repeated phrases/nonsensical text)

export const MIN_WORDS = 25;

/** Count words in a string */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * R-5: Repetition-detection heuristic.
 * Returns true if the text consists of repeated phrases or appears nonsensical.
 * Strategy: look for repeated n-grams (3+ word sequences that repeat more than once).
 */
export function hasRepetition(text: string, minRepetitions = 2, ngramSize = 3): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < ngramSize * minRepetitions) return false;

  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - ngramSize; i++) {
    const ngram = words.slice(i, i + ngramSize).join(' ');
    const count = (ngrams.get(ngram) ?? 0) + 1;
    if (count >= minRepetitions) return true;
    ngrams.set(ngram, count);
  }
  return false;
}

export interface PromptValidationResult {
  wordCount: number;
  meetsMinWords: boolean;
  hasRepetition: boolean;
  isValid: boolean;
  errors: string[];
}

/** Validate a single reflection prompt response */
export function validatePrompt(text: string): PromptValidationResult {
  const wordCount = countWords(text);
  const meetsMinWords = wordCount >= MIN_WORDS;
  const rep = hasRepetition(text);

  const errors: string[] = [];
  if (!meetsMinWords) {
    errors.push(`Please write at least ${MIN_WORDS} words (currently ${wordCount}).`);
  }
  if (rep) {
    errors.push('Your response appears to contain repeated phrases. Please write a genuine reflection.');
  }

  return { wordCount, meetsMinWords, hasRepetition: rep, isValid: meetsMinWords && !rep, errors };
}

export interface ReflectionValidationResult {
  prompt1: PromptValidationResult;
  prompt2: PromptValidationResult;
  isValid: boolean;
}

/** Validate both reflection prompts */
export function validateReflection(prompt1: string, prompt2: string): ReflectionValidationResult {
  const v1 = validatePrompt(prompt1);
  const v2 = validatePrompt(prompt2);
  return { prompt1: v1, prompt2: v2, isValid: v1.isValid && v2.isValid };
}
