import { EventDatabase } from '../db/EventDatabase.js';

/** Shape of the fields `computeCycleTime` needs off a match. */
interface CycleTimeInput {
  eventKey: string;
  tournamentKey: string;
  id: number;
  fieldNumber: number;
  actualStartTime: string;
}

/**
 * Cycle time for a match, in **fractional minutes**.
 *
 * Defined as the elapsed time between this match's `actualStartTime` and the
 * `actualStartTime` of the previous match played on the *same field within the
 * same tournament*. Minutes (rather than seconds) to match the unit already
 * used by `ScheduleParams.cycleTime`; the `match.cycleTime` column is `REAL`,
 * so the fractional part is preserved.
 *
 * Scoped to the tournament on purpose — a "cycle" spanning the gap between
 * quals and playoffs is not a number anyone wants to see in a report.
 *
 * Ordered by `actualStartTime` rather than by `id` so that matches played out
 * of schedule order still produce a sane result.
 *
 * @returns the cycle time in minutes, or `null` when there is no prior started
 * match on this field — i.e. the first match of a tournament on a given field
 * has no cycle time, and the caller should leave the existing value alone
 * rather than writing a misleading `0`.
 */
export const computeCycleTime = async (
  db: EventDatabase,
  match: CycleTimeInput
): Promise<number | null> => {
  const { eventKey, tournamentKey, id, fieldNumber, actualStartTime } = match;
  if (!actualStartTime) return null;

  const startedAt = Date.parse(actualStartTime);
  if (Number.isNaN(startedAt)) return null;

  const [previous] = await db.selectAllWhere(
    'match',
    `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" ` +
      `AND fieldNumber = ${fieldNumber} AND id != ${id} ` +
      `AND actualStartTime IS NOT NULL AND actualStartTime != '' ` +
      `AND actualStartTime < "${actualStartTime}" ` +
      `ORDER BY actualStartTime DESC LIMIT 1`
  );
  if (!previous?.actualStartTime) return null;

  const previousStartedAt = Date.parse(previous.actualStartTime);
  if (Number.isNaN(previousStartedAt)) return null;

  return (startedAt - previousStartedAt) / 1000 / 60;
};
