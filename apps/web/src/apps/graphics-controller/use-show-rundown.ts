import {
  PRODUCER_SHOW_RUNDOWN_ID,
  type Rundown,
  type RundownEntry
} from '@toa-lib/models';
import { useCallback, useState } from 'react';
import {
  graphicsApi,
  mutateProducerShow,
  useProducerShow
} from 'src/api/use-graphics-data.js';

/** How many times a mutation re-reads and re-applies after losing a revision race. */
const CONFLICT_RETRIES = 3;

export interface UseShowRundownResult {
  /** Ordered show entries, exactly as the server last committed them. */
  entries: RundownEntry[];
  /** Revision the entries above were read at, or `null` before the first load. */
  revision: number | null;
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
  /** `entryIds` is the complete new order; ids absent from the server's current entries are ignored. */
  reorder: (entryIds: string[]) => Promise<void>;
}

/**
 * Owns the producer's ordered show: the single durable, revisioned `Rundown`
 * (`PRODUCER_SHOW_RUNDOWN_ID`) that replaced the parallel `CueQueue` document.
 *
 * Every mutator is expressed as a TRANSFORM of the server's current entries,
 * never as a full array captured in a React closure. `mutate` below re-reads
 * the document, applies the transform to what the server actually holds, and
 * PATCHes with that read's `expectedRevision`; a 409 means someone else
 * committed in between, so it re-reads and re-applies rather than replaying a
 * stale array over their edit. That is the whole reason the old whole-array
 * `PUT /queue` is gone: a producer holding a stale render could silently
 * resurrect removed entries and a discarded order.
 *
 * There is no socket snapshot push any more. The realtime room never stored
 * the snapshots it was sent (it only logged their entry count), so the
 * "realtime needs an in-memory copy" contract the old hook documented was
 * already fiction; the durable rundown is the only show order there is.
 */
export const useShowRundown = (
  eventKey: string | null | undefined
): UseShowRundownResult => {
  const { data: show, mutate: revalidate } = useProducerShow(eventKey);
  const [isSaving, setIsSaving] = useState(false);

  const entries = show?.entries ?? [];
  const revision = show?.revision ?? null;

  const commit = useCallback(
    async (transform: (current: RundownEntry[]) => RundownEntry[]) => {
      if (!eventKey) return;
      setIsSaving(true);
      try {
        let latest: Rundown | null = show ?? null;
        for (let attempt = 0; attempt <= CONFLICT_RETRIES; attempt += 1) {
          // Re-read before every attempt after the first: the conflict we
          // just lost means our copy is provably behind.
          if (!latest || attempt > 0) latest = await graphicsApi.show.get(eventKey);
          if (!latest)
            throw new Error(
              `The producer show for ${eventKey} could not be loaded.`
            );
          try {
            await graphicsApi.show.patch(
              eventKey,
              transform(latest.entries),
              latest.revision
            );
            return;
          } catch (error) {
            if (attempt === CONFLICT_RETRIES || !isRevisionConflict(error))
              throw error;
          }
        }
      } finally {
        // One revalidation per mutation, success or failure - a failed write
        // still needs the UI to show what the server really holds.
        await mutateProducerShow(eventKey);
        await revalidate();
        setIsSaving(false);
      }
    },
    [eventKey, show, revalidate]
  );

  const addEntry = useCallback(
    async (
      timelineId: string,
      values: Record<string, number>,
      note?: string
    ) => {
      const entryId = newEntryId();
      await commit((current) => [
        ...current,
        {
          entryId,
          timelineId,
          ...(Object.keys(values).length > 0 ? { values } : {}),
          ...(note !== undefined ? { note } : {})
        }
      ]);
    },
    [commit]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      await commit((current) => current.filter((e) => e.entryId !== entryId));
    },
    [commit]
  );

  const updateValues = useCallback(
    async (entryId: string, values: Record<string, number>) => {
      await commit((current) =>
        current.map((e) =>
          e.entryId === entryId
            ? {
                ...e,
                ...(Object.keys(values).length > 0
                  ? { values }
                  : { values: undefined })
              }
            : e
        )
      );
    },
    [commit]
  );

  const reorder = useCallback(
    async (entryIds: string[]) => {
      // Order is sent as ids, not as entry objects, so a concurrent edit to
      // some OTHER entry's values survives this reorder instead of being
      // reverted to whatever this client last rendered. An id the server no
      // longer has is dropped; one it has that the caller did not name keeps
      // its relative position at the end.
      await commit((current) => {
        const byId = new Map(current.map((e) => [e.entryId, e]));
        const ordered: RundownEntry[] = [];
        for (const entryId of entryIds) {
          const entry = byId.get(entryId);
          if (!entry) continue;
          byId.delete(entryId);
          ordered.push(entry);
        }
        return [...ordered, ...byId.values()];
      });
    },
    [commit]
  );

  return {
    entries,
    revision,
    isSaving,
    addEntry,
    removeEntry,
    updateValues,
    reorder
  };
};

/** Matches `graphicIdentifierZod`: a UUID's hyphens are fine, its braces would not be. */
function newEntryId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

/** The API answers a lost optimistic-concurrency race with 409 CONFLICT. */
function isRevisionConflict(error: unknown): boolean {
  const code = (error as { code?: unknown } | undefined)?.code;
  if (code === 409 || code === 'CONFLICT') return true;
  const message = (error as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' && message.includes('CONFLICT');
}

export { PRODUCER_SHOW_RUNDOWN_ID };
export default useShowRundown;
