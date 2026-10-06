import { Match } from '@toa-lib/models';

/** Stations below this number are on the red alliance, the rest on blue. */
const BLUE_STATION_START = 20;

export interface SurrogateAppearance {
  /** Unique per team and match, for use as a table row key. */
  key: string;
  teamKey: number;
  matchName: string;
  fieldNumber: number;
  scheduledTime: string;
}

export interface TeamScheduleStats {
  teamKey: number;
  matchCount: number;
  surrogateCount: number;
  uniqueTeammates: number;
  uniqueOpponents: number;
  /** Matches played per field, keyed by field number. */
  fieldCounts: Record<number, number>;
}

export interface ScheduleStats {
  teams: TeamScheduleStats[];
  surrogateAppearances: SurrogateAppearance[];
}

interface TeamAccumulator {
  matchCount: number;
  surrogateCount: number;
  teammates: Set<number>;
  opponents: Set<number>;
  fieldCounts: Record<number, number>;
}

export const calculateScheduleStats = (
  matches: Match<any>[]
): ScheduleStats => {
  const accumulators = new Map<number, TeamAccumulator>();
  const surrogateAppearances: SurrogateAppearance[] = [];

  for (const match of matches) {
    const participants = match.participants ?? [];
    for (const participant of participants) {
      const stats = accumulators.get(participant.teamKey) ?? {
        matchCount: 0,
        surrogateCount: 0,
        teammates: new Set<number>(),
        opponents: new Set<number>(),
        fieldCounts: {}
      };
      accumulators.set(participant.teamKey, stats);

      stats.matchCount++;
      stats.fieldCounts[match.fieldNumber] =
        (stats.fieldCounts[match.fieldNumber] ?? 0) + 1;

      const isRed = participant.station < BLUE_STATION_START;
      for (const other of participants) {
        if (other.teamKey === participant.teamKey) continue;
        const sameAlliance = other.station < BLUE_STATION_START === isRed;
        (sameAlliance ? stats.teammates : stats.opponents).add(other.teamKey);
      }

      if (participant.surrogate > 0) {
        stats.surrogateCount++;
        surrogateAppearances.push({
          key: `${match.id}-${participant.teamKey}`,
          teamKey: participant.teamKey,
          matchName: match.name,
          fieldNumber: match.fieldNumber,
          scheduledTime: match.scheduledTime
        });
      }
    }
  }

  const teams = [...accumulators.entries()]
    .map(([teamKey, stats]) => ({
      teamKey,
      matchCount: stats.matchCount,
      surrogateCount: stats.surrogateCount,
      uniqueTeammates: stats.teammates.size,
      uniqueOpponents: stats.opponents.size,
      fieldCounts: stats.fieldCounts
    }))
    .sort((a, b) => a.teamKey - b.teamKey);

  return { teams, surrogateAppearances };
};
