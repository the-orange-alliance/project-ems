import { z } from 'zod';
import {
  graphicIdentifierZod,
  rundownZod,
  type Rundown,
  type Timeline
} from './Graphics.js';
import type { QueueEntry } from './GraphicsQueue.js';

/**
 * The ordered-show model.
 *
 * A `Rundown` (see `rundownZod` in `Graphics.ts`) is the single durable owner
 * of "what the producer runs, in order, with which template values". It
 * replaces the parallel `CueQueue` document, which carried the same ordered
 * entries in a second table with no revision of its own. Everything here is
 * pure: identity, ordering, and per-entry status derivation shared by the API
 * and the producer app so both agree on what an entry means.
 *
 * Invariants a stored rundown must satisfy:
 *  - it belongs to exactly one event (`eventKey`), and two events never share
 *    entries or ids;
 *  - `entryId` is stable for the life of an entry - reordering, editing values,
 *    or removing neighbours never renumbers it - and unique within the rundown;
 *  - `entries` order IS show order; position is never stored separately;
 *  - `revision` increments on every committed write, and a write must name the
 *    revision it was computed from (optimistic concurrency);
 *  - an entry may reference a timeline that no longer exists. That is a
 *    reportable condition (`missing-timeline`), never grounds for dropping the
 *    entry: operator-authored order outlives a deleted timeline.
 */

/**
 * The rundown id every event's producer show lives under. One per event,
 * created on demand; the legacy `graphics_queue` row migrates into it.
 */
export const PRODUCER_SHOW_RUNDOWN_ID = 'producer-show';
export const PRODUCER_SHOW_RUNDOWN_NAME = 'Producer Show';

export function emptyProducerShow(eventKey: string, atUtc: string): Rundown {
  return rundownZod.parse({
    schemaVersion: 2,
    revision: 0,
    rundownId: PRODUCER_SHOW_RUNDOWN_ID,
    eventKey,
    name: PRODUCER_SHOW_RUNDOWN_NAME,
    entries: [],
    updatedAtUtc: atUtc
  });
}

export type RundownEntry = Rundown['entries'][number];

/**
 * Why an entry cannot be cued as written. `ready` is the only cueable state;
 * every other value names something the operator can act on rather than a
 * reason to hide the row.
 */
export const rundownEntryStatusZod = z.enum([
  'ready',
  /** `timelineId` matches no timeline in this event (deleted or renamed away). */
  'missing-timeline',
  /** The timeline exists but has no items, so cueing it would show nothing. */
  'empty-timeline',
  /** The timeline declares variables this entry has no value for. */
  'missing-values'
]);
export type RundownEntryStatus = z.infer<typeof rundownEntryStatusZod>;

export interface RundownEntryView {
  entryId: string;
  timelineId: string;
  /** The timeline's current name, or the raw `timelineId` when it is missing. */
  timelineName: string;
  /** Item count of the referenced timeline; 0 when it is missing. */
  itemCount: number;
  status: RundownEntryStatus;
  /** Declared variable names this entry supplies no value for, in declaration order. */
  missingValues: string[];
}

type TimelineLike = Pick<Timeline, 'name' | 'items' | 'variables'> & {
  timelineId: string;
};

/**
 * Joins each entry to the event's timelines. The result has exactly one view
 * per entry, in rundown order - a missing timeline yields a `missing-timeline`
 * view, never a dropped row.
 */
export function describeRundownEntries(
  entries: readonly RundownEntry[],
  timelines: readonly TimelineLike[] | undefined
): RundownEntryView[] {
  return entries.map((entry) => {
    const timeline = timelines?.find((t) => t.timelineId === entry.timelineId);
    if (!timeline)
      return {
        entryId: entry.entryId,
        timelineId: entry.timelineId,
        timelineName: entry.timelineId,
        itemCount: 0,
        status: 'missing-timeline' as const,
        missingValues: []
      };
    const values = entry.values ?? {};
    const missingValues = (timeline.variables ?? [])
      .map((variable) => variable.name)
      .filter((name) => values[name] === undefined);
    return {
      entryId: entry.entryId,
      timelineId: entry.timelineId,
      timelineName: timeline.name,
      itemCount: timeline.items.length,
      status:
        timeline.items.length === 0
          ? ('empty-timeline' as const)
          : missingValues.length > 0
            ? ('missing-values' as const)
            : ('ready' as const),
      missingValues
    };
  });
}

/**
 * Normalizes an ordered entry list for storage: order preserved exactly,
 * entry ids kept wherever they are already unique and valid.
 *
 * `CueQueue` never enforced unique `entryId`s and a rundown does, so a
 * duplicate is suffixed (`entry-1` -> `entry-1-2`) rather than dropped -
 * losing an operator's queued run to a 40-year-old id collision is the worse
 * failure. An id that cannot be made valid at all is replaced positionally.
 */
export function normalizeShowEntries(
  entries: readonly RundownEntry[]
): RundownEntry[] {
  const taken = new Set<string>();
  return entries.map((entry, index) => {
    const base = graphicIdentifierZod.safeParse(entry.entryId).success
      ? entry.entryId
      : `entry-${index + 1}`;
    let entryId = base;
    for (let suffix = 2; taken.has(entryId); suffix += 1)
      entryId = `${base}-${suffix}`;
    taken.add(entryId);
    return entryId === entry.entryId ? entry : { ...entry, entryId };
  });
}

/**
 * Projects legacy `CueQueue` entries onto rundown entries. A queue entry's
 * `values` is always present (possibly `{}`) while a rundown's is optional;
 * an empty map is omitted so a migrated entry is byte-identical to one the
 * producer app would write today.
 */
export function showEntriesFromQueue(
  entries: readonly QueueEntry[]
): RundownEntry[] {
  return normalizeShowEntries(
    entries.map((entry) => ({
      entryId: entry.entryId,
      timelineId: entry.timelineId,
      ...(Object.keys(entry.values ?? {}).length > 0
        ? { values: entry.values }
        : {}),
      ...(entry.note !== undefined ? { note: entry.note } : {})
    }))
  );
}

/**
 * The inverse projection, for the deprecated `GET /graphics/:eventKey/queue`
 * read adapter only. Removed with that route in Task 16.
 */
export function queueEntriesFromShow(rundown: Rundown): QueueEntry[] {
  return rundown.entries.map((entry) => ({
    entryId: entry.entryId,
    timelineId: entry.timelineId,
    values: entry.values ?? {},
    ...(entry.note !== undefined ? { note: entry.note } : {})
  }));
}
