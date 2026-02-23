// R-6: Configurable guidance content hook
// Loads guidance.json from the public directory at runtime.
// Content can be updated by institutional admins without code deployment.

import { useState, useEffect } from 'react';

interface GuidanceContent {
  institution: string;
  tooltips: Record<string, string>;
  hints: Record<string, string>;
  helpSection: {
    title: string;
    sections: Array<{ heading: string; body: string }>;
  };
}

const DEFAULT_GUIDANCE: GuidanceContent = {
  institution: '',
  tooltips: {},
  hints: {},
  helpSection: { title: 'Help', sections: [] },
};

let _cache: GuidanceContent | null = null;

// R-6: useGuidance — loads configurable content from guidance.json
export function useGuidance(): GuidanceContent {
  const [guidance, setGuidance] = useState<GuidanceContent>(_cache ?? DEFAULT_GUIDANCE);

  useEffect(() => {
    if (_cache) return;
    void fetch('/guidance.json')
      .then((r) => r.json())
      .then((data: GuidanceContent) => {
        _cache = data;
        setGuidance(data);
      })
      .catch(() => {
        // Non-critical — fall back to defaults
      });
  }, []);

  return guidance;
}

/** R-6: Get a specific tooltip by key */
export function useTooltip(key: string): string {
  const { tooltips } = useGuidance();
  return tooltips[key] ?? '';
}

/** R-6: Get a specific hint by key */
export function useHint(key: string): string {
  const { hints } = useGuidance();
  return hints[key] ?? '';
}
