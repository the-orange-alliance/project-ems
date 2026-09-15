import { z } from 'zod';
import { variableValuesZod, type VariableValues } from './GraphicsTemplates.js';

/**
 * @deprecated Compatibility shapes only. The durable ordered-show model is
 * `Rundown` (`Graphics.ts` / `GraphicsShow.ts`): it carries the same ordered
 * entries and per-entry template values, plus the revision and event identity
 * this document never had. Stored `graphics_queue` rows migrate into the
 * event's producer-show rundown exactly once (`GraphicsSchema.ts`), and these
 * types survive only to type the deprecated `GET /graphics/:eventKey/queue`
 * read adapter and the realtime room's unread snapshot event. Task 16 deletes
 * both, and this file with them. Nothing writes through these shapes.
 *
 * Producer-facing queue of timeline runs: each entry names a timeline and
 * carries the template-variable values for that particular run (e.g. the
 * same "team spotlight" timeline queued three times for three different
 * teams).
 */

/** Same safe id pattern the API enforces on timeline ids. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const safeIdZod = z.string().regex(SAFE_ID);

export interface QueueEntry {
  entryId: string;
  timelineId: string;
  values: VariableValues;
  note?: string;
}

export interface CueQueue {
  eventKey: string;
  entries: QueueEntry[];
  updatedAtUtc: string;
}

/** What the producer app pushes to the realtime room: the queue plus each entry's item count. */
export interface QueueSnapshotEntry extends QueueEntry {
  itemCount: number;
}

export interface QueueSnapshot {
  entries: QueueSnapshotEntry[];
}

export enum GraphicsQueueSocketEvent {
  SNAPSHOT = 'graphics:queue',
  NEXT_ENTRY = 'graphics:queueNext'
}

export const queueEntryZod = z
  .object({
    entryId: safeIdZod,
    timelineId: safeIdZod,
    values: variableValuesZod,
    note: z.string().max(500).optional()
  })
  .strict();

export const cueQueueZod = z
  .object({
    eventKey: z.string(),
    entries: z.array(queueEntryZod),
    updatedAtUtc: z.string()
  })
  .strict();

export const queueSnapshotZod = z
  .object({
    entries: z.array(
      queueEntryZod.extend({
        itemCount: z.number().int().nonnegative()
      })
    )
  })
  .strict();

export function emptyCueQueue(eventKey: string, atUtc: string): CueQueue {
  return { eventKey, entries: [], updatedAtUtc: atUtc };
}

/** -1 when `entryId` is null/absent from the queue. */
export function findEntryIndex(
  queue: QueueSnapshot,
  entryId: string | null
): number {
  if (entryId === null) return -1;
  return queue.entries.findIndex((entry) => entry.entryId === entryId);
}

/**
 * The entry that should load after `entryId`.
 * - `entryId === null` -> the first entry, or null when the queue is empty.
 * - `entryId` is the last entry, not found, or the queue is empty -> null.
 * - otherwise -> the entry immediately following `entryId`.
 */
export function nextEntry(
  queue: QueueSnapshot,
  entryId: string | null
): QueueSnapshotEntry | null {
  if (entryId === null) {
    return queue.entries.length > 0 ? queue.entries[0] : null;
  }
  const index = findEntryIndex(queue, entryId);
  if (index === -1) return null;
  const following = queue.entries[index + 1];
  return following ?? null;
}
