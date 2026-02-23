// IntegrityMonitor — R-8 (cross-cutting, no UI)
// Subscribes to the event bus and raises advisory warnings when
// declarations appear to underrepresent logged AI usage.
// Pure logic — consumes events, dispatches to WarningsContext.
//
// Warning conditions (R-8):
//   (a) ENTRY_DELETED:   auto-generated entry deleted without manual replacement
//   (b) ENTRY_MODIFIED:  edits reduce the described scope of AI involvement
//                        heuristic: diffLengthDelta < -SCOPE_REDUCTION_CHAR_THRESHOLD
//                        OR tool name removed from content
//   (c) coverage_low:    declared interaction count < 60% of logged total
//   (d) tool_missing:    logged AI tool not mentioned anywhere in the declaration
//
// Rules (from CLAUDE.md):
//   - Warnings are ADVISORY only — never block submission (R-8)
//   - IntegrityMonitor treats manual entries the same as auto-generated (R-10)

import { useEffect, useCallback } from 'react';
import { eventBus } from '../../events/eventBus';
import { useWarningsDispatch } from '../../contexts/WarningsContext';
import type { IntegrityWarning } from '../../events/types';

// R-8(c): Coverage threshold below which a warning is raised
export const COVERAGE_THRESHOLD = 0.6;

// R-8(b): Minimum character reduction that triggers a scope-reduction warning
export const SCOPE_REDUCTION_CHAR_THRESHOLD = 20;

function makeWarning(
  id: string,
  condition: IntegrityWarning['condition'],
  message: string,
  extra?: Partial<IntegrityWarning>,
): IntegrityWarning {
  return {
    id,
    condition,
    message,
    raisedAt: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Hook that activates the IntegrityMonitor for a given declaration.
 * Must be mounted once at the declaration level.
 * R-8: IntegrityMonitor
 */
export function useIntegrityMonitor(params: {
  declarationId: string;
  loggedTools: string[];
  totalLoggedCount: number;
  getDeclaredCount: () => number;
  getEntryContents: () => string[];
}) {
  const dispatch = useWarningsDispatch();
  const { declarationId, loggedTools, totalLoggedCount, getDeclaredCount, getEntryContents } =
    params;

  // R-8(a): auto-generated entry deleted without manual replacement
  const checkEntryDeleted = useCallback(
    (entryId: string, origin: string) => {
      if (origin === 'auto-generated' || origin === 'auto-generated-modified') {
        const warning = makeWarning(
          `warn-deleted-${entryId}`,
          'entry_deleted',
          'An auto-generated entry was deleted. If this AI usage was real, add a manual entry to maintain an accurate declaration.',
          { relatedEntryId: entryId },
        );
        dispatch({ type: 'ADD_WARNING', warning });
        eventBus.emit('INTEGRITY_WARNING_RAISED', { warning });
      }
    },
    [dispatch],
  );

  // R-8(b): edit reduces scope — heuristic: content shortened significantly OR tool name removed
  const checkScopeReduction = useCallback(
    (entryId: string, previousContent: string, newContent: string, diffDelta: number) => {
      const toolMentionRemoved = loggedTools.some(
        (tool) =>
          previousContent.toLowerCase().includes(tool.toLowerCase()) &&
          !newContent.toLowerCase().includes(tool.toLowerCase()),
      );
      if (diffDelta < -SCOPE_REDUCTION_CHAR_THRESHOLD || toolMentionRemoved) {
        const warning = makeWarning(
          `warn-scope-${entryId}`,
          'scope_reduced',
          'An edit appears to reduce the described scope of AI involvement. Ensure your declaration still accurately represents your usage.',
          { relatedEntryId: entryId },
        );
        dispatch({ type: 'ADD_WARNING', warning });
        eventBus.emit('INTEGRITY_WARNING_RAISED', { warning });
      } else {
        // Clear a previous scope warning for this entry if the edit no longer triggers it
        dispatch({ type: 'CLEAR_WARNING', warningId: `warn-scope-${entryId}` });
      }
    },
    [dispatch, loggedTools],
  );

  // R-8(c): declared count < 60% of logged total
  const checkCoverage = useCallback(() => {
    const declaredCount = getDeclaredCount();
    const coverage = totalLoggedCount > 0 ? declaredCount / totalLoggedCount : 1;
    if (totalLoggedCount > 0 && coverage < COVERAGE_THRESHOLD) {
      const pct = Math.round(coverage * 100);
      const warning = makeWarning(
        `warn-coverage-${declarationId}`,
        'coverage_low',
        `Your declaration covers only ${pct}% of your logged interactions (minimum recommended: ${COVERAGE_THRESHOLD * 100}%). Consider adding manual entries for uncovered interactions.`,
      );
      dispatch({ type: 'ADD_WARNING', warning });
      eventBus.emit('INTEGRITY_WARNING_RAISED', { warning });
    } else {
      dispatch({ type: 'CLEAR_WARNING', warningId: `warn-coverage-${declarationId}` });
      eventBus.emit('INTEGRITY_WARNING_CLEARED', {
        warningId: `warn-coverage-${declarationId}`,
        condition: 'coverage_low',
      });
    }
  }, [declarationId, dispatch, getDeclaredCount, totalLoggedCount]);

  // R-8(d): logged AI tool not mentioned anywhere in the declaration
  const checkToolMentions = useCallback(() => {
    const allContent = getEntryContents().join(' ').toLowerCase();
    for (const tool of loggedTools) {
      if (!allContent.includes(tool.toLowerCase())) {
        const warningId = `warn-tool-${declarationId}-${tool}`;
        const warning = makeWarning(
          warningId,
          'tool_missing',
          `"${tool}" appears in your interaction logs but is not mentioned in your declaration. Ensure all AI tools are accounted for.`,
          { relatedTool: tool },
        );
        dispatch({ type: 'ADD_WARNING', warning });
        eventBus.emit('INTEGRITY_WARNING_RAISED', { warning });
      } else {
        dispatch({
          type: 'CLEAR_WARNING',
          warningId: `warn-tool-${declarationId}-${tool}`,
        });
      }
    }
  }, [declarationId, dispatch, getEntryContents, loggedTools]);

  // Subscribe to event bus
  useEffect(() => {
    // R-8(a)
    const onEntryDeleted: Parameters<typeof eventBus.on<'ENTRY_DELETED'>>[1] = (payload) => {
      checkEntryDeleted(payload.entryId, payload.entry.origin);
      checkCoverage();
      checkToolMentions();
    };

    // R-8(b)
    const onEntryModified: Parameters<typeof eventBus.on<'ENTRY_MODIFIED'>>[1] = (payload) => {
      checkScopeReduction(
        payload.entryId,
        payload.previousContent,
        payload.newContent,
        payload.diffLengthDelta,
      );
      checkToolMentions();
    };

    // R-10: manual entries count toward coverage
    const onManualAdded = () => {
      checkCoverage();
      checkToolMentions();
    };
    const onManualRemoved = () => {
      checkCoverage();
    };

    eventBus.on('ENTRY_DELETED', onEntryDeleted);
    eventBus.on('ENTRY_MODIFIED', onEntryModified);
    eventBus.on('MANUAL_ENTRY_ADDED', onManualAdded);
    eventBus.on('MANUAL_ENTRY_REMOVED', onManualRemoved);

    // Run initial coverage and tool-mention checks
    checkCoverage();
    checkToolMentions();

    return () => {
      eventBus.off('ENTRY_DELETED', onEntryDeleted);
      eventBus.off('ENTRY_MODIFIED', onEntryModified);
      eventBus.off('MANUAL_ENTRY_ADDED', onManualAdded);
      eventBus.off('MANUAL_ENTRY_REMOVED', onManualRemoved);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declarationId, totalLoggedCount]);

  return null;
}
