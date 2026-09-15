import type { GraphicSpec, RundownEntry, Timeline } from '@toa-lib/models';
import { resolveSpec, unresolvedBindings } from '@toa-lib/models';
import { useCallback, useMemo, useRef, useState } from 'react';
import { localClient } from '../../api/http-clients.js';
import {
  backgroundQueries,
  statQueryKey
} from '../../api/bounded-query-scheduler.js';

/**
 * What one warm actually did, item by item.
 *
 * Reported rather than swallowed because the old version's silence was the
 * bug (F10): every item could fail and the row would still say "last refresh
 * at 14:32", which is precisely the reassurance a producer must not be given
 * about data that was never fetched.
 */
export interface QueueRowRefreshCounts {
  /** Items a query was actually issued for. */
  attempted: number;
  /** Queries that returned data. */
  succeeded: number;
  /** Items skipped with nothing to warm - a template binding this entry has no value for yet. */
  unavailable: number;
  /** Queries that failed (calculator error, network, 4xx/5xx). */
  failed: number;
}

export interface QueueRowRefreshInfo extends QueueRowRefreshCounts {
  /** True while a refresh for this row is in flight. */
  fetching: boolean;
  /** When the work actually began, or `null` before the first attempt. */
  startedAtUtc: string | null;
  /**
   * When a refresh last COMPLETED WITH DATA - at least one item succeeded.
   * `null` after a warm in which nothing succeeded, so the row cannot claim
   * freshness it does not have.
   */
  lastRefreshedAtUtc: string | null;
  /** When the last attempt finished, whatever its outcome. */
  lastAttemptedAtUtc: string | null;
}

export interface UseQueueRowRefreshResult {
  /** Per-entryId refresh state, for the row's icon/tooltip. Absent entries have never been refreshed. */
  refreshInfo: Record<string, QueueRowRefreshInfo>;
  /**
   * Warms the stats cache for every item in `entry`'s timeline, resolved
   * against `entry.values` - so that when this entry is later promoted onto
   * the transport (Take, or the show's own on-deck auto-pull), the cue's own
   * query (`PlaybackNavigation.prepareCueAt`) hits a fresh cache instead of a
   * cold one.
   *
   * Deliberately bypasses the live transport entirely - `state.loaded`/`cue`/
   * `program` are never touched; this is cache warming only. It queries
   * `POST /stats/:eventKey/query` through the page-wide bounded scheduler
   * (`bounded-query-scheduler.ts`), so however long the timeline is, the warm
   * never exceeds the shared ceiling and never issues a request preflight is
   * already making for the same spec.
   *
   * Resolves to the counts describing what happened. An item whose bindings
   * do not fully resolve is reported as `unavailable` (there is nothing to
   * warm yet) rather than silently dropped; a request failure is reported as
   * `failed` rather than swallowed. A genuinely missing `eventKey` still
   * throws, since that is a caller bug, not a normal outcome.
   *
   * Returns `null` when there was nothing to do at all (no timeline, no items,
   * or a warm for this row was already running).
   */
  refreshEntry: (
    eventKey: string,
    entry: RundownEntry,
    timeline: Timeline | undefined
  ) => Promise<QueueRowRefreshCounts | null>;
}

const emptyCounts = (): QueueRowRefreshCounts => ({
  attempted: 0,
  succeeded: 0,
  unavailable: 0,
  failed: 0
});

/** The query body `POST /stats/:eventKey/query` takes for one resolved spec. */
function warmQuery(spec: GraphicSpec) {
  return {
    stat: spec.stat,
    selectors: spec.selectors,
    filters: spec.filters,
    params: spec.params,
    refresh: true
  };
}

/**
 * Owns the "last refreshed" / "fetching" indicator shown on each show rundown
 * row's refresh icon (see `rundown-list.tsx`'s `RowActions`). One instance is
 * shared by every row in the show, keyed by `entryId`.
 *
 * The returned object is memoized: it is read inside an effect in
 * `graphics-controller.tsx`, and a fresh object identity on every render made
 * that effect a dependency-change treadmill (F19).
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
      entry: RundownEntry,
      timeline: Timeline | undefined
    ): Promise<QueueRowRefreshCounts | null> => {
      if (!eventKey) throw new Error('No event selected');
      if (inFlightRef.current.has(entry.entryId)) return null;
      const items = timeline?.items ?? [];
      // Nothing to warm and nothing claimed: crucially, this records NO
      // completion. The old version marked the row refreshed here, which is
      // how an On Deck warm that ran before the timelines had loaded could
      // permanently skip itself (F19).
      if (items.length === 0) return null;

      inFlightRef.current.add(entry.entryId);
      const startedAtUtc = new Date().toISOString();
      setRefreshInfo((prev) => {
        const previous = prev[entry.entryId];
        return {
          ...prev,
          [entry.entryId]: {
            ...(previous ?? emptyCounts()),
            fetching: true,
            startedAtUtc,
            lastRefreshedAtUtc: previous?.lastRefreshedAtUtc ?? null,
            lastAttemptedAtUtc: previous?.lastAttemptedAtUtc ?? null
          }
        };
      });

      const counts = emptyCounts();
      try {
        const values = entry.values ?? {};
        await Promise.all(
          items.map(async (rawSpec) => {
            if (unresolvedBindings(rawSpec, values).length > 0) {
              counts.unavailable += 1;
              return;
            }
            const query = warmQuery(resolveSpec(rawSpec, values));
            counts.attempted += 1;
            try {
              await backgroundQueries.run(
                statQueryKey(eventKey, query, true),
                () =>
                  localClient.post(`/stats/${eventKey}/query`, { body: query })
              );
              counts.succeeded += 1;
            } catch {
              // Counted, not swallowed: the row says so, and the producer can
              // decide whether to run this entry on cold data.
              counts.failed += 1;
            }
          })
        );
      } finally {
        inFlightRef.current.delete(entry.entryId);
        const completedAtUtc = new Date().toISOString();
        setRefreshInfo((prev) => ({
          ...prev,
          [entry.entryId]: {
            ...counts,
            fetching: false,
            startedAtUtc,
            lastAttemptedAtUtc: completedAtUtc,
            // Only a warm that actually brought data back may claim
            // freshness. A total failure keeps the previous (possibly null)
            // timestamp - "never refreshed" is the honest answer there.
            lastRefreshedAtUtc:
              counts.succeeded > 0
                ? completedAtUtc
                : (prev[entry.entryId]?.lastRefreshedAtUtc ?? null)
          }
        }));
      }
      return counts;
    },
    []
  );

  return useMemo(
    () => ({ refreshInfo, refreshEntry }),
    [refreshInfo, refreshEntry]
  );
};

export default useQueueRowRefresh;
