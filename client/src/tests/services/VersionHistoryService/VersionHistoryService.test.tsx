// Tests for VersionHistoryService — createSnapshot and useVersionHistoryService
// Covers: async createSnapshot, hook event subscription, cleanup

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { WarningsProvider } from '../../../contexts/WarningsContext';

vi.mock('../../../hooks/useApi', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../../events/eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { api } from '../../../hooks/useApi';
import { eventBus } from '../../../events/eventBus';
import { createSnapshot, useVersionHistoryService } from '../../../services/VersionHistoryService/index';

function wrapper({ children }: { children: React.ReactNode }) {
  return <WarningsProvider>{children}</WarningsProvider>;
}

describe('createSnapshot', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('posts to /version-history/{declarationId} and returns snapshotId', async () => {
    vi.mocked(api.post).mockResolvedValue({ snapshotId: 'snap-001' });
    const result = await createSnapshot('d1', 'initial_open', []);
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/version-history/d1', { trigger: 'initial_open', active_warnings: [] });
    expect(result).toBe('snap-001');
  });

  it('passes active warnings to the API', async () => {
    vi.mocked(api.post).mockResolvedValue({ snapshotId: 'snap-002' });
    const warnings = [{ id: 'w1', condition: 'coverage_low', message: 'Low coverage' }];
    await createSnapshot('d1', 'review_step', warnings);
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/version-history/d1', { trigger: 'review_step', active_warnings: warnings });
  });

  it('defaults activeWarnings to empty array', async () => {
    vi.mocked(api.post).mockResolvedValue({ snapshotId: 'snap-003' });
    await createSnapshot('d1', 'submission');
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/version-history/d1', { trigger: 'submission', active_warnings: [] });
  });

  it('propagates API errors', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Network error'));
    await expect(createSnapshot('d1', 'manual_save')).rejects.toThrow('Network error');
  });
});

describe('useVersionHistoryService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('subscribes to DECLARATION_SNAPSHOT on mount', () => {
    renderHook(() => useVersionHistoryService({ declarationId: 'd1' }), { wrapper });
    expect(vi.mocked(eventBus.on)).toHaveBeenCalledWith('DECLARATION_SNAPSHOT', expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useVersionHistoryService({ declarationId: 'd1' }), { wrapper });
    unmount();
    expect(vi.mocked(eventBus.off)).toHaveBeenCalledWith('DECLARATION_SNAPSHOT', expect.any(Function));
  });

  it('does not subscribe when declarationId is empty', () => {
    renderHook(() => useVersionHistoryService({ declarationId: '' }), { wrapper });
    expect(vi.mocked(eventBus.on)).not.toHaveBeenCalledWith('DECLARATION_SNAPSHOT', expect.any(Function));
  });

  it('calls createSnapshot when DECLARATION_SNAPSHOT event fires for matching declarationId', () => {
    vi.mocked(api.post).mockResolvedValue({ snapshotId: 'snap-010' });
    renderHook(() => useVersionHistoryService({ declarationId: 'd1' }), { wrapper });
    const onCall = vi.mocked(eventBus.on).mock.calls.find((c) => c[0] === 'DECLARATION_SNAPSHOT');
    expect(onCall).toBeDefined();
    const handler = onCall![1] as (payload: unknown) => void;
    handler({ declarationId: 'd1', assignmentId: 'a1', trigger: 'review_step', timestamp: new Date().toISOString() });
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/version-history/d1', expect.objectContaining({ trigger: 'review_step' }));
  });

  it('ignores DECLARATION_SNAPSHOT events for different declarationId', () => {
    vi.mocked(api.post).mockResolvedValue({ snapshotId: 'snap-010' });
    renderHook(() => useVersionHistoryService({ declarationId: 'd1' }), { wrapper });
    const onCall = vi.mocked(eventBus.on).mock.calls.find((c) => c[0] === 'DECLARATION_SNAPSHOT');
    const handler = onCall![1] as (payload: unknown) => void;
    handler({ declarationId: 'd2', assignmentId: 'a1', trigger: 'review_step', timestamp: new Date().toISOString() });
    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });
});
