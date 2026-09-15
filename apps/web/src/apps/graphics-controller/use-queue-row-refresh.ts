import type { QueueEntry, Timeline } from '@toa-lib/models';
import { resolveSpec, unresolvedBindings } from '@toa-lib/models';
import { useCallback, useRef, useState } from 'react';
import { localClient } from '../../api/http-clients.js';

export interface QueueRowRefreshInfo {
  /** True while a refresh for this row is in flight. */
  fetching: boolean;
  /** ISO timestamp of the last time a refresh for this row completed (attempted, not necessarily every item succeeded), or `null` if never refreshed this session. */
  lastRefreshedAtUtc: string | null;
}

export interface UseQueueRowRefreshResult {
  /** Per-entryId refresh state, for the row's icon/tooltip. Absent entries have never been refreshed. */
  refreshInfo: Record<string, QueueRowRefreshInfo>;
  /**
   * Warms the stats cache for every item in `entry`'s timeline, resolved
   * against `entry.values` - so that when this entry is later promoted onto
   * the transport (Quick Play, or the queue's own on-deck auto-pull), the
   * cue's own query (`PlaybackNavigation.prepareCueAt`) hits a fresh cache
   * instead of a cold one.
   *
   * Deliberately bypasses the live transport entirely - `state.loaded`/
   * `cue`/`program` are never touched; this is cache warming only.
   * queries `POST /stats/:eventKey/query` directly. An item whose bindings
   * don't fully resolve against `entry.values` is silently skipped (nothing
   * useful to warm yet - matches `unresolvedBindings`' role everywhere else
   * in this app). A per-item request failure is swallowed - this is a
   * best-effort cache warm, never a producer-facing action - but a genuinely
   * missing `eventKey` throws, since that's a caller bug, not a normal
   * outcome.
   */
  refreshEntry: (
    eventKey: string,
    entry: QueueEntry,
    timeline: Timeline | undefined
  ) => Promise<void>;
}

/**
 * Owns the "last refreshed" / "fetching" indicator shown on each Timeline
 * Queue row's refresh icon (see `cue-queue.tsx`'s `RowActions`). One
 * instance is shared by every row in the queue, keyed by `entryId`.
 */
export const useQueueRowRefresh = (): UseQueueRowRefreshResult => {
  const [refreshInfo, setRefreshInfo] = useState<
    Record<string, QueueRowRefreshInfo>
  >({});
  // In-flight guard so promotion (effect) and a manual click can't pile up
  // two overlapping refreshes for the same row.
  const inFlightRef = useRef<Set<string>>(new Set());

  const refreshEntry = useCallback(
    async (
      eventKey: string,
      entry: QueueEntry,
      timeline: Timeline | undefined
    ): Promise<void> => {
      if (!eventKey) throw new Error('No event selected');
      if (inFlightRef.current.has(entry.entryId)) return;
      const items = timeline?.items ?? [];
      if (items.length === 0) return;

      inFlightRef.current.add(entry.entryId);
      setRefreshInfo((prev) => ({
        ...prev,
        [entry.entryId]: {
          fetching: true,
          lastRefreshedAtUtc: prev[entry.entryId]?.lastRefreshedAtUtc ?? null
        }
      }));
      try {
        await Promise.allSettled(
          items.map((rawSpec) => {
            const missing = unresolvedBindings(rawSpec, entry.values ?? {});
            if (missing.length > 0) return Promise.resolve();
            const spec = resolveSpec(rawSpec, entry.values ?? {});
            return localClient.post(`/stats/${eventKey}/query`, {
              body: {
                stat: spec.stat,
                selectors: spec.selectors,
                filters: spec.filters,
                params: spec.params,
                refresh: true
              }
            });
          })
        );
      } finally {
        inFlightRef.current.delete(entry.entryId);
        setRefreshInfo((prev) => ({
          ...prev,
          [entry.entryId]: {
            fetching: false,
            lastRefreshedAtUtc: new Date().toISOString()
          }
        }));
      }
    },
    []
  );

  return { refreshInfo, refreshEntry };
};

export default useQueueRowRefresh;
