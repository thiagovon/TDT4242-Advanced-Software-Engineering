// renderHook tests for useIntegrityMonitor
// Tests the hook's event handling, warning dispatch, and coverage/tool checks

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { WarningsProvider, useWarnings } from '../../../contexts/WarningsContext';

// Store event handlers registered via eventBus.on
const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock('../../../events/eventBus', () => ({
  eventBus: {
    emit: vi.fn((event: string, payload?: unknown) => {
      // Also trigger registered handlers for testing
      if (eventHandlers[event]) {
        for (const handler of eventHandlers[event]) {
          handler(payload);
        }
      }
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
      }
    }),
  },
}));

import { eventBus } from '../../../events/eventBus';
import { useIntegrityMonitor, COVERAGE_THRESHOLD, SCOPE_REDUCTION_CHAR_THRESHOLD } from '../../../modules/IntegrityMonitor/index';

function wrapper({ children }: { children: React.ReactNode }) {
  return <WarningsProvider>{children}</WarningsProvider>;
}

describe('useIntegrityMonitor — renderHook tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all registered handlers
    for (const key of Object.keys(eventHandlers)) {
      delete eventHandlers[key];
    }
  });

  it('registers 4 event listeners on mount', () => {
    renderHook(
      () =>
        useIntegrityMonitor({
          declarationId: 'd1',
          loggedTools: ['ChatGPT'],
          totalLoggedCount: 5,
          getDeclaredCount: () => 5,
          getEntryContents: () => ['Used ChatGPT'],
        }),
      { wrapper },
    );

    expect(vi.mocked(eventBus.on)).toHaveBeenCalledWith('ENTRY_DELETED', expect.any(Function));
    expect(vi.mocked(eventBus.on)).toHaveBeenCalledWith('ENTRY_MODIFIED', expect.any(Function));
    expect(vi.mocked(eventBus.on)).toHaveBeenCalledWith('MANUAL_ENTRY_ADDED', expect.any(Function));
    expect(vi.mocked(eventBus.on)).toHaveBeenCalledWith('MANUAL_ENTRY_REMOVED', expect.any(Function));
  });

  it('unregisters event listeners on unmount', () => {
    const { unmount } = renderHook(
      () =>
        useIntegrityMonitor({
          declarationId: 'd1',
          loggedTools: [],
          totalLoggedCount: 0,
          getDeclaredCount: () => 0,
          getEntryContents: () => [],
        }),
      { wrapper },
    );

    unmount();

    expect(vi.mocked(eventBus.off)).toHaveBeenCalledWith('ENTRY_DELETED', expect.any(Function));
    expect(vi.mocked(eventBus.off)).toHaveBeenCalledWith('ENTRY_MODIFIED', expect.any(Function));
    expect(vi.mocked(eventBus.off)).toHaveBeenCalledWith('MANUAL_ENTRY_ADDED', expect.any(Function));
    expect(vi.mocked(eventBus.off)).toHaveBeenCalledWith('MANUAL_ENTRY_REMOVED', expect.any(Function));
  });

  it('raises coverage_low warning on mount when coverage < 60%', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: [],
        totalLoggedCount: 10,
        getDeclaredCount: () => 3, // 30% < 60%
        getEntryContents: () => [],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    expect(capturedWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: 'coverage_low' }),
      ]),
    );
  });

  it('does not raise coverage_low when coverage >= 60%', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: [],
        totalLoggedCount: 10,
        getDeclaredCount: () => 6, // 60% = threshold
        getEntryContents: () => [],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    const coverageWarnings = (capturedWarnings as { condition: string }[]).filter(
      (w) => w.condition === 'coverage_low',
    );
    expect(coverageWarnings).toHaveLength(0);
  });

  it('raises tool_missing warning when a logged tool is not in entries', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: ['ChatGPT', 'Copilot'],
        totalLoggedCount: 5,
        getDeclaredCount: () => 5,
        getEntryContents: () => ['Used ChatGPT for explanations'], // no mention of Copilot
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    expect(capturedWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: 'tool_missing', relatedTool: 'Copilot' }),
      ]),
    );
  });

  it('does not raise tool_missing when all tools are mentioned (case-insensitive)', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: ['ChatGPT', 'Copilot'],
        totalLoggedCount: 5,
        getDeclaredCount: () => 5,
        getEntryContents: () => ['Used chatgpt and copilot for everything'],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    const toolWarnings = (capturedWarnings as { condition: string }[]).filter(
      (w) => w.condition === 'tool_missing',
    );
    expect(toolWarnings).toHaveLength(0);
  });

  it('handles ENTRY_DELETED event for auto-generated entries', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: [],
        totalLoggedCount: 0,
        getDeclaredCount: () => 0,
        getEntryContents: () => [],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    act(() => {
      vi.mocked(eventBus.emit).getMockImplementation()?.('ENTRY_DELETED', {
        entryId: 'e1',
        entry: { origin: 'auto-generated' },
      });
    });

    expect(capturedWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: 'entry_deleted', relatedEntryId: 'e1' }),
      ]),
    );
  });

  it('handles ENTRY_MODIFIED event with scope reduction', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: ['ChatGPT'],
        totalLoggedCount: 5,
        getDeclaredCount: () => 5,
        getEntryContents: () => ['ChatGPT'],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    act(() => {
      vi.mocked(eventBus.emit).getMockImplementation()?.('ENTRY_MODIFIED', {
        entryId: 'e1',
        previousContent: 'Used ChatGPT extensively for everything',
        newContent: 'Used it briefly',
        previousOrigin: 'auto-generated',
        newOrigin: 'auto-generated-modified',
        diffLengthDelta: -25,
      });
    });

    expect(capturedWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: 'scope_reduced', relatedEntryId: 'e1' }),
      ]),
    );
  });

  it('coverage defaults to 1 when totalLoggedCount is 0', () => {
    let capturedWarnings: unknown[] = [];
    function TestHook() {
      useIntegrityMonitor({
        declarationId: 'd1',
        loggedTools: [],
        totalLoggedCount: 0,
        getDeclaredCount: () => 0,
        getEntryContents: () => [],
      });
      const { warnings } = useWarnings();
      capturedWarnings = warnings;
      return null;
    }

    renderHook(() => TestHook(), { wrapper });

    const coverageWarnings = (capturedWarnings as { condition: string }[]).filter(
      (w) => w.condition === 'coverage_low',
    );
    expect(coverageWarnings).toHaveLength(0);
  });

  it('exports COVERAGE_THRESHOLD as 0.6 and SCOPE_REDUCTION_CHAR_THRESHOLD as 20', () => {
    expect(COVERAGE_THRESHOLD).toBe(0.6);
    expect(SCOPE_REDUCTION_CHAR_THRESHOLD).toBe(20);
  });
});
