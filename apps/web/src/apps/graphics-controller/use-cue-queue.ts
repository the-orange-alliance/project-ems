import type {
  QueueEntry,
  QueueSnapshot,
  QueueSnapshotEntry
} from '@toa-lib/models';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  graphicsApi,
  useCueQueue as useCueQueueData,
  useTimelines
} from 'src/api/use-graphics-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export interface UseCueQueueResult {
  entries: QueueEntry[];
  isSaving: boolean;
  addEntry: (
    timelineId: string,
    values: Record<string, number>,
    note?: string
  ) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  updateValues: (
    entryId: string,
    values: Record<string, number>
  ) => Promise<void>;
  reorder: (entries: QueueEntry[]) => Promise<void>;
}

/**
 * Owns the producer's cue queue: the persisted (API-backed) list of queued
 * timeline runs, plus the realtime room's in-memory copy of it.
 *
 * The realtime room has NO database access - it only knows the queue
 * because the producer app pushes it a `QueueSnapshot` over the socket
 * (`GraphicsQueueSocketEvent.SNAPSHOT`). That copy is what lets the
 * "Next" transport button auto-advance across a timeline boundary during a
 * live show, so every mutator here both persists the full entries array
 * through `graphicsApi.queue.put` AND re-pushes a snapshot afterward - and
 * the snapshot is ALSO re-pushed whenever the socket (re)connects, since a
 * realtime service restart wipes its in-memory copy with nothing left
 * behind to rebuild it from.
 */
export const useCueQueue = (
  eventKey: string | null | undefined
): UseCueQueueResult => {
  const { data: queue, mutate } = useCueQueueData(eventKey);
  const { data: timelines } = useTimelines(eventKey);
  const { events, ready } = useSocketWorker();
  const [isSaving, setIsSaving] = useState(false);

  const entries = queue?.entries ?? [];

  // Joins each entry to its timeline's current item count. An entry whose
  // `timelineId` no longer matches any timeline (the producer deleted or
  // renamed it away) is NOT dropped here - the persisted queue keeps it -
  // it is only marked `itemCount: 0` in the snapshot, which is enough for
  // the realtime room to treat it as unadvanceable. The UI marks it
  // "broken" separately (via `rowInfo`/`missing` in `cue-queue.tsx`).
  const buildSnapshot = useCallback(
    (forEntries: QueueEntry[]): QueueSnapshot => ({
      entries: forEntries.map((entry): QueueSnapshotEntry => {
        const timeline = timelines?.find(
          (t) => t.timelineId === entry.timelineId
        );
        return { ...entry, itemCount: timeline?.items.length ?? 0 };
      })
    }),
    [timelines]
  );

  const pushSnapshot = useCallback(
    (forEntries: QueueEntry[]) => {
      events.graphicsQueueSnapshot(buildSnapshot(forEntries));
    },
    [events, buildSnapshot]
  );

  // Re-push on (re)connect - guarded against the two failure modes called
  // out in the task:
  //  1. Pushing an empty snapshot before the queue has actually loaded.
  //     `queue` is `undefined` until the initial SWR fetch resolves (and
  //     the API layer types a failed fetch as `null` too), so this effect
  //     refuses to run until `queue` is a real object - it never falls
  //     back to treating "not loaded yet" as "empty queue".
  //  2. An effect dependency cycle that re-pushes forever. `timelines` is
  //     read inside the effect (via `pushSnapshot`/`buildSnapshot`) but
  //     deliberately left OUT of its dependency array - only `ready` (the
  //     connection signal) and `queue` drive it. A `pushedRef`
  //     additionally ensures at most one push per connected session: it is
  //     armed right after pushing and disarmed when `ready` drops back to
  //     false, so the next genuine reconnect (not a local edit, which is
  //     already pushed by the mutators below) re-arms it exactly once.
  const pushedRef = useRef(false);
  useEffect(() => {
    if (!ready) {
      pushedRef.current = false;
      return;
    }
    // `queue` is `undefined` while the initial SWR fetch is in flight, and
    // the API layer types a failed/absent fetch as `null` too - treat both
    // the same as "not loaded yet" so a fetch hiccup can never masquerade
    // as a genuinely empty queue and wipe the room's copy.
    if (queue == null) return;
    if (pushedRef.current) return;
    pushedRef.current = true;
    pushSnapshot(queue.entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queue]);

  const persist = useCallback(
    async (nextEntries: QueueEntry[]) => {
      if (!eventKey) return;
      setIsSaving(true);
      try {
        await graphicsApi.queue.put(eventKey, nextEntries);
        await mutate();
        pushSnapshot(nextEntries);
      } finally {
        setIsSaving(false);
      }
    },
    [eventKey, mutate, pushSnapshot]
  );

  const addEntry = useCallback(
    async (
      timelineId: string,
      values: Record<string, number>,
      note?: string
    ) => {
      const entry: QueueEntry = {
        entryId: crypto.randomUUID(),
        timelineId,
        values,
        note
      };
      // Immutable: a fresh array via spread, `entries` itself untouched.
      await persist([...entries, entry]);
    },
    [entries, persist]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      await persist(entries.filter((e) => e.entryId !== entryId));
    },
    [entries, persist]
  );

  const updateValues = useCallback(
    async (entryId: string, values: Record<string, number>) => {
      await persist(
        entries.map((e) => (e.entryId === entryId ? { ...e, values } : e))
      );
    },
    [entries, persist]
  );

  const reorder = useCallback(
    async (nextEntries: QueueEntry[]) => {
      await persist(nextEntries);
    },
    [persist]
  );

  return {
    entries,
    isSaving,
    addEntry,
    removeEntry,
    updateValues,
    reorder
  };
};

export default useCueQueue;
