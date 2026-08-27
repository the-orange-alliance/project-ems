import { z } from 'zod';
import { EventDatabase } from '../db/EventDatabase.js';

export const nowUtc = (): string => new Date().toISOString();

/**
 * Bumps a match's `updatedAtUtc`.
 *
 * Call this for participant and detail writes too — the timestamp covers the
 * whole match aggregate, not just the `match` row, so that a consumer polling
 * `?since=` gets the match back whichever part of it changed.
 */
export const touchMatch = async (
  db: EventDatabase,
  eventKey: string,
  tournamentKey: string,
  id: number | string
): Promise<void> => {
  await db.updateWhere(
    'match',
    { updatedAtUtc: nowUtc() },
    `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
  );
};

/**
 * `?since=<iso8601>` reconciliation cursor.
 *
 * Declared here rather than in `@toa-lib/models` on purpose: `GlobalSchema`
 * registers every zod schema exported from that package into the global
 * registry, and @fastify/swagger crashes when a querystring schema gets $ref'd
 * (see the `ParamsSchemaIds` note in `GlobalSchema.ts`).
 */
export const SinceQuery = z.object({
  since: z.iso
    // `offset: true` accepts `+00:00`-style zones alongside `Z`. Consumers echo
    // back timestamps through their own date libraries, plenty of which
    // serialize UTC as an explicit zero offset; rejecting those would be a
    // gratuitous round-tripping failure. A zone of some kind is still required,
    // since a bare local time doesn't name an instant.
    .datetime({ offset: true })
    .optional()
    .describe(
      'ISO-8601 UTC instant. Returns only records whose updatedAtUtc is strictly ' +
        'after it. Advance the cursor using the largest updatedAtUtc in the ' +
        'response, keeping your previous cursor when the response is empty.'
    )
});

/**
 * SQL fragment restricting rows to those updated strictly after `since`, or an
 * empty string when no cursor was supplied. Intended to be appended to an
 * existing `WHERE` clause.
 *
 * `since` is re-serialized rather than interpolated as given, which matters
 * twice over:
 *
 *  - **Safety.** `selectAllWhere` builds SQL by string concatenation, and
 *    canonical `toISOString()` output cannot carry a quote or a SQL fragment.
 *    The zod schema rejects malformed input before we get here, so this is
 *    belt-and-braces — but the belt is what keeps a future schema change from
 *    turning into an injection.
 *  - **Correctness.** This is a string comparison in SQLite, which is only
 *    meaningful when both sides are canonical fixed-width UTC (`Z`, 3-digit
 *    milliseconds). A consumer echoing back `2026-08-09T14:22:31+00:00`, or
 *    dropping the milliseconds, would otherwise silently skip or re-fetch rows.
 */
export const sinceClause = (since?: string): string => {
  if (!since) return '';
  return ` AND "updatedAtUtc" > "${canonical(since)}"`;
};

/**
 * `sinceClause` for `match_participant`, which has no timestamp of its own and
 * is filtered by its parent match instead.
 *
 * Correlating on `tournamentKey` as well as `id` is not optional:
 * `match_participant`'s primary key is `(eventKey, tournamentKey, id, station)`,
 * so match ids repeat across tournaments within an event, and an id-only
 * subquery would hand back participants from the wrong tournament.
 */
export const participantsSinceClause = (since?: string): string => {
  if (!since) return '';
  return (
    ` AND EXISTS (SELECT 1 FROM "match" WHERE` +
    ` "match"."eventKey" = "match_participant"."eventKey"` +
    ` AND "match"."tournamentKey" = "match_participant"."tournamentKey"` +
    ` AND "match"."id" = "match_participant"."id"` +
    ` AND "match"."updatedAtUtc" > "${canonical(since)}")`
  );
};

const canonical = (since: string): string => new Date(since).toISOString();
