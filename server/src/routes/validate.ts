// Server-side reflection validation — R-5
// POST /api/validate/reflection
// Mirrors the client-side validation logic as the submission gate.
// R-5: dual-layer validation — client gives immediate feedback, server gates submission.

import { Router } from 'express';

const router = Router();

const MIN_WORDS = 25;
const NGRAM_SIZE = 3;
const MIN_REPETITIONS = 2;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// R-5: repetition detection — mirrors client-side logic
function hasRepetition(text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < NGRAM_SIZE * MIN_REPETITIONS) return false;
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - NGRAM_SIZE; i++) {
    const ngram = words.slice(i, i + NGRAM_SIZE).join(' ');
    const count = (ngrams.get(ngram) ?? 0) + 1;
    if (count >= MIN_REPETITIONS) return true;
    ngrams.set(ngram, count);
  }
  return false;
}

// POST /api/validate/reflection
router.post('/reflection', (req, res) => {
  const { prompt1, prompt2 } = req.body as { prompt1: string; prompt2: string };

  const errors: { field: string; message: string }[] = [];

  for (const [field, text] of [['prompt1', prompt1], ['prompt2', prompt2]] as const) {
    const wc = countWords(text ?? '');
    if (wc < MIN_WORDS) {
      errors.push({ field, message: `Must be at least ${MIN_WORDS} words (currently ${wc}).` });
    } else if (hasRepetition(text ?? '')) {
      errors.push({ field, message: 'Response appears to contain repeated phrases.' });
    }
  }

  if (errors.length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  res.json({ valid: true });
});

export default router;
