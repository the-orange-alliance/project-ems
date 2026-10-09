import type { Match } from '@toa-lib/models';

export interface MatchCycleTimes {
  group: string;
  prestartToStart: number;
  scheduleVariance: number;
  cycle: number;
}

const toMs = (iso?: string): number => (iso ? Date.parse(iso) : NaN);

/**
 * Parses `"1,2; 3; 4,5"` into field groups. Fields that are missing, unknown,
 * or already used are left to cycle on their own.
 */
export const parseFieldGroups = (
  text: string,
  fieldCount: number
): number[][] => {
  const used = new Set<number>();
  const groups = text.split(/[;|]/).flatMap((part) => {
    const group = part
      .split(/[\s,+]+/)
      .map((token) => Number(token))
      .filter(
        (field) =>
          Number.isInteger(field) &&
          field >= 1 &&
          field <= fieldCount &&
          !used.has(field) &&
          used.add(field)
      );
    return group.length > 0 ? [group.sort((a, b) => a - b)] : [];
  });
  for (let field = 1; field <= fieldCount; field++) {
    if (!used.has(field)) groups.push([field]);
  }
  return groups.sort((a, b) => a[0] - b[0]);
};

/**
 * Times for every match, in milliseconds (NaN when unknown). A group's matches
 * that share a scheduled time are one round; cycle time is the gap between the
 * earliest starts of consecutive rounds in the group.
 */
export const computeCycleTimes = (
  matches: Match<any>[],
  groups: number[][]
): Map<number, MatchCycleTimes> => {
  const result = new Map<number, MatchCycleTimes>();

  for (const group of groups) {
    const label = group.join(' + ');
    const groupMatches = matches.filter((m) => group.includes(m.fieldNumber));

    const rounds = new Map<string, { start: number; ids: number[] }>();
    for (const m of groupMatches) {
      const start = toMs(m.actualStartTime);
      if (!Number.isFinite(start)) continue;
      const key = Number.isFinite(toMs(m.scheduledTime))
        ? m.scheduledTime
        : `match-${m.id}`;
      const round = rounds.get(key) ?? { start, ids: [] };
      round.start = Math.min(round.start, start);
      round.ids.push(m.id);
      rounds.set(key, round);
    }

    const cycleById = new Map<number, number>();
    const ordered = [...rounds.values()].sort((a, b) => a.start - b.start);
    ordered.forEach((round, i) => {
      const cycle = i === 0 ? NaN : round.start - ordered[i - 1].start;
      round.ids.forEach((id) => cycleById.set(id, cycle));
    });

    for (const m of groupMatches) {
      const start = toMs(m.actualStartTime);
      result.set(m.id, {
        group: label,
        prestartToStart: start - toMs(m.prestartTime),
        scheduleVariance: start - toMs(m.scheduledTime),
        cycle: cycleById.get(m.id) ?? NaN
      });
    }
  }

  return result;
};
