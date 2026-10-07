import {
  Match,
  ScheduleItem,
  assignMatchTimes,
  matchParticipantZod,
  matchWithDetailsZod
} from '@toa-lib/models';
import { z } from 'zod';

// Event and tournament keys are omitted: they are replaced with the current ones on import.
const keys = { eventKey: true, tournamentKey: true } as const;

const importedMatchZod = matchWithDetailsZod.omit(keys).extend({
  participants: z.array(matchParticipantZod.omit(keys)).min(1)
});

// Accepts a bare list of matches or the `{ matches }` wrapper produced by "Download as JSON".
const scheduleImportZod = z.union([
  z.array(importedMatchZod),
  z.object({ matches: z.array(importedMatchZod) })
]);

interface ImportTarget {
  eventKey: string;
  tournamentKey: string;
  scheduleItems: ScheduleItem[];
  /** Team keys that exist in the database for the event. */
  teamKeys: ReadonlySet<number>;
}

const describeIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
};

/**
 * Parses an uploaded schedule file into matches for `target`, throwing an
 * `Error` with a user-readable message when it can't be imported. Matches
 * beyond the schedule's match slots are dropped.
 */
export const parseScheduleImport = (
  text: string,
  { eventKey, tournamentKey, scheduleItems, teamKeys }: ImportTarget
): Match<any>[] => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  const result = scheduleImportZod.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid schedule: ${describeIssue(result.error.issues[0])}`
    );
  }

  const slots = scheduleItems.filter((item) => item.isMatch).length;
  if (slots === 0) {
    throw new Error('The schedule has no match slots.');
  }

  const imported = Array.isArray(result.data)
    ? result.data
    : result.data.matches;
  if (imported.length < slots) {
    throw new Error(
      `Schedule has ${imported.length} matches but needs at least ${slots}.`
    );
  }

  const matches = imported.slice(0, slots);
  const unknownTeams = new Set(
    matches
      .flatMap((m) => m.participants.map((p) => p.teamKey))
      .filter((teamKey) => !teamKeys.has(teamKey))
  );
  if (unknownTeams.size > 0) {
    throw new Error(`Unknown team keys: ${[...unknownTeams].join(', ')}.`);
  }

  return assignMatchTimes(
    matches.map((m) => ({
      ...m,
      eventKey,
      tournamentKey,
      participants: m.participants.map((p) => ({
        ...p,
        eventKey,
        tournamentKey
      }))
    })),
    scheduleItems
  );
};
