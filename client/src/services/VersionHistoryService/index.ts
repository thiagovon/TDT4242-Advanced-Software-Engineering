// VersionHistoryService — R-9
// Listens to DECLARATION_SNAPSHOT events and posts full assembled state
// to the backend's append-only version log.
//
// R-9: snapshot on 4 trigger events (initial_open, review_step, submission, manual_save)
// R-9: append-only — never mutates or deletes snapshots
// R-13: also handles pre_regeneration and post_regeneration triggers

import { useEffect } from 'react';
import { eventBus } from '../../events/eventBus';
import { api } from '../../hooks/useApi';
import { useWarnings } from '../../contexts/WarningsContext';

interface SnapshotParams {
  declarationId: string;
}

/**
 * R-9: Programmatic snapshot trigger.
 * Called directly by components (e.g., ReviewAggregator on step entry).
 */
export async function createSnapshot(
  declarationId: string,
  trigger: string,
  activeWarnings: unknown[] = [],
): Promise<string> {
  const result = await api.post<{ snapshotId: string }>(`/version-history/${declarationId}`, {
    trigger,
    active_warnings: activeWarnings,
  });
  return result.snapshotId;
}

/**
 * R-9: Hook that subscribes to DECLARATION_SNAPSHOT events and posts to the backend.
 * Mount once at the app level.
 */
export function useVersionHistoryService({ declarationId }: SnapshotParams) {
  const { warnings } = useWarnings();

  useEffect(() => {
    if (!declarationId) return;

    const handler: Parameters<typeof eventBus.on<'DECLARATION_SNAPSHOT'>>[1] = (payload) => {
      if (payload.declarationId !== declarationId) return;
      void createSnapshot(declarationId, payload.trigger, warnings);
    };

    eventBus.on('DECLARATION_SNAPSHOT', handler);
    return () => { eventBus.off('DECLARATION_SNAPSHOT', handler); };
  }, [declarationId, warnings]);
}
