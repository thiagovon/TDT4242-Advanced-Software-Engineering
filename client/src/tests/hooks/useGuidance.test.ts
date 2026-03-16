// Hook tests for useGuidance, useTooltip, useHint — R-6
// Uses renderHook to test hook functions directly
// Also validates guidance.json structure

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { countWords } from '../../modules/ReflectionModule/validation';

let useGuidance: typeof import('../../hooks/useGuidance').useGuidance;
let useTooltip: typeof import('../../hooks/useGuidance').useTooltip;
let useHint: typeof import('../../hooks/useGuidance').useHint;

const mockGuidanceData = {
  institution: 'Test University',
  tooltips: {
    draft_button: 'Generate a draft declaration',
    stats_panel: 'View your usage statistics',
  },
  hints: {
    reflection: 'Write thoughtfully about your AI usage',
    manual_entry: 'Add entries the logger missed',
  },
  helpSection: {
    title: 'How to use AIGuidebook',
    sections: [
      { heading: 'Getting Started', body: 'Welcome to the AIGuidebook.' },
    ],
  },
};

describe('R-6: Guidance content structure', () => {
  it('guidance.json must contain required top-level keys', async () => {
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
      expect(countWords(value)).toBeGreaterThan(3);
      void key;
    }
  });
});

describe('useGuidance hook', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../hooks/useGuidance');
    useGuidance = mod.useGuidance;
    useTooltip = mod.useTooltip;
    useHint = mod.useHint;
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => { fetchSpy.mockRestore(); });

  it('returns DEFAULT_GUIDANCE before fetch resolves', () => {
    fetchSpy.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useGuidance());
    expect(result.current.institution).toBe('');
    expect(result.current.tooltips).toEqual({});
    expect(result.current.hints).toEqual({});
    expect(result.current.helpSection.title).toBe('Help');
    expect(result.current.helpSection.sections).toEqual([]);
  });

  it('fetches guidance.json and returns parsed data', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockGuidanceData) } as Response);
    const { result } = renderHook(() => useGuidance());
    await waitFor(() => { expect(result.current.institution).toBe('Test University'); });
    expect(result.current.tooltips.draft_button).toBe('Generate a draft declaration');
    expect(result.current.helpSection.sections).toHaveLength(1);
  });

  it('falls back to defaults when fetch fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useGuidance());
    await waitFor(() => { expect(fetchSpy).toHaveBeenCalledWith('/guidance.json'); });
    expect(result.current.institution).toBe('');
    expect(result.current.tooltips).toEqual({});
  });

  it('caches the result and does not re-fetch on second render', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockGuidanceData) } as Response);
    const { result: result1 } = renderHook(() => useGuidance());
    await waitFor(() => { expect(result1.current.institution).toBe('Test University'); });
    const { result: result2 } = renderHook(() => useGuidance());
    expect(result2.current.institution).toBe('Test University');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useTooltip hook', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../hooks/useGuidance');
    useTooltip = mod.useTooltip;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve(mockGuidanceData) } as Response);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns tooltip value for known key', async () => {
    const { result } = renderHook(() => useTooltip('draft_button'));
    await waitFor(() => { expect(result.current).toBe('Generate a draft declaration'); });
  });

  it('returns empty string for unknown key', async () => {
    const { result } = renderHook(() => useTooltip('nonexistent_key'));
    await waitFor(() => { expect(result.current).toBe(''); });
  });
});

describe('useHint hook', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../hooks/useGuidance');
    useHint = mod.useHint;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve(mockGuidanceData) } as Response);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns hint value for known key', async () => {
    const { result } = renderHook(() => useHint('reflection'));
    await waitFor(() => { expect(result.current).toBe('Write thoughtfully about your AI usage'); });
  });

  it('returns empty string for unknown key', async () => {
    const { result } = renderHook(() => useHint('missing_key'));
    await waitFor(() => { expect(result.current).toBe(''); });
  });
});
