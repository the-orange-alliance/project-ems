import { DateTime } from 'luxon';
import {
  FINALS_LEVEL,
  OCTOFINALS_LEVEL,
  PRACTICE_LEVEL,
  QUALIFICATION_LEVEL,
  QUARTERFINALS_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL,
  SEMIFINALS_LEVEL,
  TEST_LEVEL
} from './Match.js';
import { z } from 'zod';

export const tournamentTypeZod = z.enum([
  'Test',
  'Practice',
  'Qualification',
  'Round Robin',
  'Ranking',
  'Eliminations',
  'Finals'
]);

export type TournamentType = z.infer<typeof tournamentTypeZod>;

/**
 * Whether a tournament type is a playoff/alliance-based format (as opposed to
 * an individual-team format like Test/Practice/Qualification/Ranking). Used
 * to decide between alliance-based UI (participant picker, schedule options,
 * match generator) and the individual-team equivalents.
 *
 * Mirrors {@link isPlayoffsTournament} in Tournament.ts, which delegates here
 * so the list of playoff types is defined in exactly one place.
 */
export const isPlayoffsTournamentType = (type: TournamentType): boolean =>
  type === 'Round Robin' || type === 'Eliminations' || type === 'Finals';

export const TournamentTypes = [
  {
    key: 'Test',
    name: 'Test'
  },
  {
    key: 'Practice',
    name: 'Practice'
  },
  {
    key: 'Qualification',
    name: 'Qualification'
  },
  {
    key: 'Round Robin',
    name: 'Round Robin'
  },
  {
    key: 'Ranking',
    name: 'Ranking'
  },
  {
    key: 'Eliminations',
    name: 'Eliminations'
  },
  {
    key: 'Finals',
    name: 'Finals'
  }
];

export const DATE_FORMAT_MIN = 'dddd, MMMM Do YYYY, h:mm a';
export const DATE_FORMAT_MIN_SHORT = 'ddd, MMMM Do YYYY, h:mm a';

export interface DayBreak {
  id: number; // Break number in the day
  name: string; // Name of the break
  // When the break should start, as an ISO string. It begins at the first gap
  // between matches on or after this time, so a match is never cut short.
  startTime: string;
  endTime: string; // startTime + duration, as an ISO string
  duration: number; // Duration of the break in minutes as a number
}

export const defaultBreak: DayBreak = {
  id: 0,
  name: 'Break',
  startTime: DateTime.now().toISO() ?? '',
  endTime: DateTime.now().toISO() ?? '',
  duration: 30
};

export interface Day {
  id: number; // Number of day in the schedule starting from 0
  startTime: string; // When the first match can start, as an ISO string
  endTime: string; // When the last match must be finished by, as an ISO string
  scheduledMatches: number; // Matches that fit in the day, worked out from the window
  breaks: DayBreak[]; // Breaks in this day
}

export const defaultDay: Day = {
  id: 0,
  startTime: DateTime.now().toISO() ?? '',
  endTime: DateTime.now().toISO() ?? '',
  scheduledMatches: 0,
  breaks: []
};

export const scheduleItemZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  id: z.number(),
  name: z.string(),
  type: z.enum(tournamentTypeZod.options),
  day: z.number(),
  startTime: z.string(),
  duration: z.number(),
  isMatch: z.coerce.boolean()
});

export type ScheduleItem = z.infer<typeof scheduleItemZod>;

export const defaultScheduleItem: ScheduleItem = {
  eventKey: '',
  tournamentKey: '',
  id: -1,
  name: '',
  type: 'Test',
  day: 0,
  startTime: DateTime.now().toISO() ?? '',
  duration: 0,
  isMatch: false
};

export interface ScheduleParams {
  eventKey: string;
  tournamentKey: string;
  type: TournamentType;
  days: Day[];
  matchConcurrency: number;
  teamKeys: number[];
  cycleTime: number;
  hasPremiereField: boolean;
  matchesPerTeam: number;
  options: ScheduleOptions;
}

export interface ScheduleOptions {
  seriesType?: 1 | 3 | 5;
  allianceCount?: number;
  rounds: number;
  teamsPerAlliance: number;
}

export const defaultScheduleParams: ScheduleParams = {
  tournamentKey: '',
  eventKey: '',
  type: 'Test',
  days: [],
  matchConcurrency: 1,
  teamKeys: [],
  cycleTime: 5,
  hasPremiereField: false,
  matchesPerTeam: 5,
  options: {
    rounds: 5,
    teamsPerAlliance: 3
  }
};

export function calculateTotalMatches(schedule: ScheduleParams): number {
  const {
    type,
    teamKeys,
    matchesPerTeam,
    options: { rounds, teamsPerAlliance, allianceCount, seriesType }
  } = schedule;
  const teamsParticipating = teamKeys.length;
  switch (type) {
    case 'Round Robin':
    case 'Eliminations':
      if (!allianceCount) return 0;
      // Round up: an odd alliance count gives a half-match per round, and
      // matches come in whole numbers.
      return Math.ceil((allianceCount / 2) * rounds);
    // if (rounds) {
    //   return (playoffsOptions.allianceCount / 2) * playoffsOptions.rounds;
    // } else {
    //   return (
    //     (playoffsOptions.allianceCount / 2) *
    //     (playoffsOptions.allianceCount - 1)
    //   );
    // }
    case 'Finals':
      return seriesType ?? 3; // Default to Bo3
    default: {
      // Zero teams per alliance would divide by zero (Infinity / NaN matches).
      const teamsPerMatch = teamsPerAlliance * 2;
      return teamsPerMatch > 0
        ? Math.ceil((teamsParticipating * matchesPerTeam) / teamsPerMatch)
        : 0;
    }
  }
}

export const levelToType = (level: number): TournamentType => {
  switch (level) {
    case TEST_LEVEL:
      return 'Test';
    case PRACTICE_LEVEL:
      return 'Practice';
    case QUALIFICATION_LEVEL:
      return 'Qualification';
    case RANKING_LEVEL:
      return 'Ranking';
    case ROUND_ROBIN_LEVEL:
      return 'Round Robin';
    case OCTOFINALS_LEVEL:
      return 'Eliminations';
    case QUARTERFINALS_LEVEL:
      return 'Eliminations';
    case SEMIFINALS_LEVEL:
      return 'Eliminations';
    case FINALS_LEVEL:
      return 'Eliminations';
    default:
      return 'Qualification';
  }
};
