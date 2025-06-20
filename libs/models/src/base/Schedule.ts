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
import { Team } from './Team.js';
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

export const DATE_FORMAT_MIN = 'dddd, MMMM Do YYYY, h:mm a';
export const DATE_FORMAT_MIN_SHORT = 'ddd, MMMM Do YYYY, h:mm a';

export interface DayBreak {
  id: number; // Break number in the day
  name: string; // Name of the break
  startTime: string; // Start time of the break as a Moment ISO string
  endTime: string; // End time of the break as a Moment ISO string
  duration: number; // Duration of the break in minutes as a number
  afterMatch: number; // Number after match in the day, not the entire schedule.
}

export const defaultBreak: DayBreak = {
  id: 0,
  name: 'Break',
  startTime: DateTime.now().toISO() ?? '',
  endTime: DateTime.now().toISO() ?? '',
  duration: 30,
  afterMatch: 1
};

export interface Day {
  id: number; // Number of day in the schedule starting from 0
  startTime: string; // Start time of the day from match 0 as a Moment ISO string
  endTime: string; // End time of the day after the last match  as a Moment ISO string
  scheduledMatches: number; // Number of matches to play in this day
  breaks: DayBreak[]; // Amount of breaks in this day
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
  isMatch: false,
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

export function generateScheduleItems(
  schedule: ScheduleParams
): ScheduleItem[] {
  const scheduleItems: ScheduleItem[] = [];
  let totalMatches = 0;
  for (const day of schedule.days) {
    const matchBreaks: number[] = day.breaks.map(
      (dayBreak) => dayBreak.afterMatch
    );
    let breakPadding = 0;
    let dayMatches = 0;
    for (let i = 0; i < day.scheduledMatches; i++) {
      const item: ScheduleItem = { ...defaultScheduleItem };
      const breakIndex = matchBreaks.indexOf(dayMatches + 1);
      item.type = schedule.type;
      let matchIndex = dayMatches;
      if (schedule.matchConcurrency > 1) {
        matchIndex = dayMatches - schedule.matchConcurrency + 1;
      }

      item.eventKey = schedule.eventKey;
      item.tournamentKey = schedule.tournamentKey;
      item.id = scheduleItems.length;
      item.day = day.id;
      item.name = schedule.type + ' Match ' + (totalMatches + 1);
      item.duration = schedule.cycleTime;
      item.startTime =
        DateTime.fromISO(day.startTime)
          .plus({
            minutes:
              Math.ceil(matchIndex / schedule.matchConcurrency) *
                schedule.cycleTime +
              breakPadding
          })
          .toISO() ?? '';
      item.isMatch = true;
      item.tournamentKey = schedule.tournamentKey;
      scheduleItems.push(item);
      dayMatches++;
      totalMatches++;
      if (breakIndex !== -1) {
        const breakItem: ScheduleItem = { ...defaultScheduleItem };
        breakItem.eventKey = schedule.eventKey;
        breakItem.tournamentKey = schedule.tournamentKey;
        breakItem.id = scheduleItems.length;
        breakItem.day = day.id;
        breakItem.duration = day.breaks[breakIndex].duration;
        breakItem.name = day.breaks[breakIndex].name;
        breakItem.startTime = day.breaks[breakIndex].startTime;
        breakItem.isMatch = false;
        item.tournamentKey = schedule.tournamentKey;
        scheduleItems.push(breakItem);
        breakPadding += day.breaks[breakIndex].duration;
      }
    }
  }
  return scheduleItems;
}

interface ScheduleValidator {
  maxTotalMatches: number;
  remainingMatches: number;
  validationMessage: string;
  valid: boolean;
}

export function getScheduleValidation(
  schedule: ScheduleParams | null | undefined
): ScheduleValidator {
  if (!schedule) {
    return {
      maxTotalMatches: 0,
      remainingMatches: 0,
      valid: false,
      validationMessage: 'No schedule provided.'
    };
  }

  const maxTotalMatches = calculateTotalMatches(schedule);

  if (schedule.days.length <= 0)
    return {
      maxTotalMatches,
      remainingMatches: 0,
      valid: false,
      validationMessage: 'More than 1 day of competition must be scheduled.'
    };

  const remainingMatches =
    maxTotalMatches -
    schedule.days
      .map((d) => d.scheduledMatches)
      .reduce((prev, curr) => prev + curr);
  let participantsSelected = true;
  let allMatchesScheduled = true;
  let daysAreAfterEachOther = true;
  let daysHaveAtLeastOneMatch = true;
  let previousDayStart = DateTime.fromISO(schedule.days[0].startTime).minus({
    days: 1
  });
  let validationMessage = '';
  for (const day of schedule.days) {
    if (DateTime.fromISO(day.startTime).day) {
    }
    if (
      !(
        DateTime.fromISO(day.startTime).startOf('day') >
        previousDayStart.startOf('day')
      )
    ) {
      daysAreAfterEachOther = false;
    }
    if (day.scheduledMatches <= 0) {
      daysHaveAtLeastOneMatch = false;
    }
    previousDayStart = DateTime.fromISO(day.startTime);
  }
  allMatchesScheduled = remainingMatches === 0;
  if (!allMatchesScheduled) {
    const matchesLeft = Math.abs(remainingMatches);
    if (remainingMatches < 0) {
      validationMessage = `Too many matches are scheduled. You need to remove ${matchesLeft} matches from the schedule.`;
    } else {
      validationMessage = `Not all of the matches are scheduled. You need to schedule ${matchesLeft} more matches.`;
    }
  } else if (!daysAreAfterEachOther) {
    validationMessage =
      'Not all of the scheduled day start times are after each other.';
  } else if (!daysHaveAtLeastOneMatch) {
    validationMessage = 'Not all scheduled days contain at least 1 match.';
  } else {
    validationMessage = '';
  }
  if (schedule.teamKeys.length <= 0) {
    validationMessage = 'There are not enough teams for this schedule.';
    participantsSelected = false;
  }

  const valid =
    participantsSelected &&
    allMatchesScheduled &&
    daysAreAfterEachOther &&
    daysHaveAtLeastOneMatch;

  return { maxTotalMatches, remainingMatches, valid, validationMessage };
}

export function calculateTotalMatches(schedule: ScheduleParams): number {
  const {
    type,
    teamKeys,
    options: { rounds, teamsPerAlliance, allianceCount, seriesType }
  } = schedule;
  const teamsParticipating = teamKeys.length;
  switch (type) {
    case 'Practice':
      return Math.ceil((teamsParticipating * rounds) / (teamsPerAlliance * 2));
    case 'Qualification':
      return Math.ceil((teamsParticipating * rounds) / (teamsPerAlliance * 2));
    case 'Ranking':
      return Math.ceil((teamsParticipating * rounds) / (teamsPerAlliance * 2));
    case 'Round Robin':
      if (!allianceCount) return 0;
      return (allianceCount / 2) * rounds;
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
    default:
      return Math.ceil((teamsParticipating * rounds) / (teamsPerAlliance * 2));
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
