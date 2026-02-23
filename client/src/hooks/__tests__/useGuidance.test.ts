// Tests for useGuidance — R-6
// Verifies that guidance content is loaded from configuration, not hardcoded.

import { describe, it, expect } from 'vitest';
import { countWords } from '../../modules/ReflectionModule/validation';

// R-6: The structure of the guidance config is validated here.
// The actual file is at /public/guidance.json.
describe('R-6: Guidance content structure', () => {
  it('guidance.json must contain required top-level keys', async () => {
    // We test the shape by importing the JSON directly
    const guidance = await import('../../../public/guidance.json');
    expect(guidance).toHaveProperty('tooltips');
    expect(guidance).toHaveProperty('hints');
    expect(guidance).toHaveProperty('helpSection');
  });

  it('guidance.json tooltips must cover origin badge types (R-1)', async () => {
    const guidance = await import('../../../public/guidance.json');
    expect(guidance.tooltips).toHaveProperty('originBadge_auto_generated');
    expect(guidance.tooltips).toHaveProperty('originBadge_auto_generated_modified');
    expect(guidance.tooltips).toHaveProperty('originBadge_manual');
  });

  it('guidance.json helpSection must have at least one section', async () => {
    const guidance = await import('../../../public/guidance.json');
    expect(guidance.helpSection.sections.length).toBeGreaterThan(0);
  });

  it('guidance.json hint content is non-empty strings', async () => {
    const guidance = await import('../../../public/guidance.json');
    for (const [key, value] of Object.entries(guidance.hints)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      // Hints should be meaningful sentences
      expect(countWords(value)).toBeGreaterThan(3);
      void key;
    }
  });
});
