import {
  PRODUCER_SHOW_RUNDOWN_ID,
  type Rundown,
  type RundownEntry,
  type ShowAdvanceResult
} from '@toa-lib/models';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  /**
   * The atomic "advance the show" operation: consume an entry and load it onto
   * the transport in one server command. See `consume` below.
   */
  consume: (options?: ConsumeOptions) => Promise<ShowAdvanceResult | null>;
  /**
   * Entry ids with an advance in flight, plus `ON_DECK` while an on-deck
   * advance is running. Controls that would start a CONFLICTING action must be
   * disabled against this - a second press cannot start a second consume, but
   * it should not look like it did nothing either.
   */
  pendingEntryIds: string[];
}

/** The key `pendingEntryIds` uses for an advance that named no entry ("whatever is on deck"). */
export const ON_DECK = '#on-deck';

export interface ConsumeOptions {
  /** Omit to consume whatever is on deck (position 1) at the moment the server handles this. */
  entryId?: string;
  /** Also take it to air (Quick Play / the row's Take button). */
  take?: boolean;
  /** Take whatever is on air off first ("Animate Out and Clear"). */
  clearFirst?: boolean;
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
  // Advances in flight, keyed by entry id (or `ON_DECK`). The ref is the
  // single-flight guard; the state mirror only exists so the UI can disable
  // the controls that would conflict with it.
  const inFlightRef = useRef<Map<string, Promise<ShowAdvanceResult | null>>>(
    new Map()
  );
  const [pendingEntryIds, setPendingEntryIds] = useState<string[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const pendingList = () => [...inFlightRef.current.keys()];

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
          if (!latest || attempt > 0)
            latest = await graphicsApi.show.get(eventKey);
          if (!latest)
            throw new Error(
              `The producer show for ${eventKey} could not be loaded.`
            );
          try {
            // The PATCH returns the document the server committed and
            // `graphicsApi.show.patch` applies it to the SWR cache once. There
            // is deliberately no revalidation here on success: the pair of
            // `mutateProducerShow()` + `revalidate()` this used to run fired
            // two concurrent re-reads of the same key, and the later response
            // to arrive won even when it was the staler one (F22).
            await graphicsApi.show.patch(
              eventKey,
              transform(latest.entries),
              latest.revision
            );
            return;
          } catch (error) {
            if (attempt === CONFLICT_RETRIES || !isRevisionConflict(error)) {
              // A failed write leaves the client with no document it can
              // trust, so this is the one path that must go back to the
              // server. Once.
              await mutateProducerShow(eventKey);
              await revalidate();
              throw error;
            }
          }
        }
      } finally {
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

  /**
   * Consumes one show entry and loads it onto the transport - the ONE way the
   * show advances, used by the row Take buttons, "Animate Out and Clear", and
   * the idle auto-pull.
   *
   * Everything that made this racy in the browser is gone:
   *
   *  - it is ONE request. The server removes the entry in the same durable
   *    transaction that puts it on the transport, so an entry can never be
   *    both loaded and still queued (and therefore never run twice).
   *  - it is single-flight per entry. A double click, a re-render, or a
   *    StrictMode effect replay joins the in-flight promise instead of
   *    starting a second consume.
   *  - the request id is derived from the entry and the show revision, so even
   *    a call that escapes the local guard (a remount, a retry after a dropped
   *    response) is de-duplicated by the SERVER and returns the original
   *    outcome. A genuinely failed attempt records no command, so retrying it
   *    under the same id still works.
   *  - the returned show is applied to the cache once, by the API layer. This
   *    hook never revalidates behind it.
   *
   * The result is returned rather than thrown on rejection: `outcome` and
   * `acknowledgment.error` are how the caller tells a real failure from an
   * empty show, and both carry the authoritative state with them.
   */
  const consume = useCallback(
    async (options: ConsumeOptions = {}): Promise<ShowAdvanceResult | null> => {
      if (!eventKey) return null;
      const key = options.entryId ?? ON_DECK;
      const inFlight = inFlightRef.current.get(key);
      if (inFlight) return inFlight;
      const flight = graphicsApi.show
        .advance(eventKey, {
          requestId: advanceRequestId(key, revision),
          ...(options.entryId ? { entryId: options.entryId } : {}),
          ...(options.take ? { take: true } : {}),
          ...(options.clearFirst ? { clearFirst: true } : {})
        })
        .finally(() => {
          inFlightRef.current.delete(key);
          if (mountedRef.current) setPendingEntryIds(pendingList());
        });
      inFlightRef.current.set(key, flight);
      setPendingEntryIds(pendingList());
      return flight;
    },
    [eventKey, revision]
  );

  return {
    entries,
    revision,
    isSaving,
    addEntry,
    removeEntry,
    updateValues,
    reorder,
    consume,
    pendingEntryIds
  };
};

/**
 * The request id for one advance of the show.
 *
 * Deliberately DERIVED rather than random: the same operator action (the same
 * entry, chosen from the same show revision) must carry the same id however
 * many times the browser is provoked into sending it - a double click, an
 * effect replay, a component remount, a retry after a dropped response. The
 * server then executes it exactly once and replays the original outcome for
 * every repeat. The show revision is part of the id so a LATER, genuinely new
 * action on the same position is a different request.
 *
 * Matches `graphicIdentifierZod` (letters, digits, `_`, `-`): entry ids are
 * already constrained to that, and `ON_DECK`'s `#` is stripped.
 */
function advanceRequestId(key: string, revision: number | null): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '') || 'ondeck';
  return `advance-${safe}-r${revision ?? 0}`.slice(0, 150);
}

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
