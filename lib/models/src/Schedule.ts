import moment, { Moment } from 'moment';
import { Team } from './Team';
import { isBoolean, isNonNullObject, isNumber, isString } from './types';

export type TournamentType =
  | 'Test'
  | 'Practice'
  | 'Qualification'
  | 'Round Robin'
  | 'Ranking'
  | 'Eliminations';

export interface DayBreak {
  id: number; // Break number in the day
  name: string; // Name of the break
  startTime: Moment; // Start time of the break as a Moment
  endTime: Moment; // End time of the break as a Moment
  duration: number; // Duration of the break in minutes as a number
  afterMatch: number; // Number after match in the day, not the entire schedule.
}

export const defaultBreak: DayBreak = {
  id: 0,
  name: 'Break',
  startTime: moment(),
  endTime: moment().add(30, 'minutes'),
  duration: 30,
  afterMatch: 1
};

export interface Day {
  id: number; // Number of day in the schedule starting from 0
  startTime: Moment; // Start time of the day from match 0
  endTime: Moment; // End time of the day after the last match
  scheduledMatches: number; // Number of matches to play in this day
  breaks: DayBreak[]; // Amount of breaks in this day
}

export const defaultDay: Day = {
  id: 0,
  startTime: moment(),
  endTime: moment(),
  scheduledMatches: 0,
  breaks: []
};

export interface ScheduleItem {
  key: string;
  name: string;
  day: number;
  startTime: Moment;
  duration: number;
  isMatch: boolean;
  tournamentId: number;
}

export const defaultScheduleItem: ScheduleItem = {
  key: '',
  name: '',
  day: 0,
  startTime: moment(),
  duration: 0,
  isMatch: false,
  tournamentId: -1
};

export const isScheduleItem = (obj: unknown): obj is ScheduleItem =>
  isNonNullObject(obj) &&
  isString(obj.key) &&
  isString(obj.name) &&
  isNumber(obj.day) &&
  isString(obj.startTime) &&
  isNumber(obj.duration) &&
  isBoolean(obj.isMatch) &&
  isNumber(obj.tournamentId);

export interface EventSchedule {
  type: TournamentType;
  days: Day[];
  matchConcurrency: number;
  teams?: Team[];
  teamsParticipating: number;
  teamsPerAlliance: number;
  matchesPerTeam: number;
  totalMatches: number;
  cycleTime: number;
  hasPremiereField: boolean;
  tournamentId: number;
}

export const defaultEventSchedule: EventSchedule = {
  type: 'Test',
  days: [],
  matchConcurrency: 1,
  teams: [],
  teamsParticipating: 0,
  teamsPerAlliance: 2,
  matchesPerTeam: 5,
  totalMatches: 0,
  cycleTime: 5,
  hasPremiereField: false,
  tournamentId: -1
};

export function generateScheduleItems(
  schedule: EventSchedule,
  eventKey: string
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
      const item: ScheduleItem = defaultScheduleItem;
      const breakIndex = matchBreaks.indexOf(dayMatches + 1);

      let matchIndex = dayMatches;
      if (schedule.matchConcurrency > 1) {
        matchIndex = dayMatches - schedule.matchConcurrency + 1;
      }

      item.key =
        eventKey +
        '-' +
        schedule.type.substring(0, 1) +
        (schedule.tournamentId > -1 ? schedule.tournamentId : '') +
        (scheduleItems.length + 1).toString().padStart(3, '0');
      item.day = day.id;
      item.name = schedule.type + ' Match ' + (totalMatches + 1);
      item.duration = schedule.cycleTime;
      item.startTime = moment(day.startTime).add(
        Math.ceil(matchIndex / schedule.matchConcurrency) * schedule.cycleTime +
          breakPadding,
        'minutes'
      );
      item.isMatch = true;
      item.tournamentId = schedule.tournamentId;
      scheduleItems.push(item);
      dayMatches++;
      totalMatches++;

      if (breakIndex !== -1) {
        const breakItem: ScheduleItem = defaultScheduleItem;
        breakItem.key =
          eventKey +
          '-' +
          schedule.type.substring(0, 1) +
          (schedule.tournamentId > -1 ? schedule.tournamentId : '') +
          (scheduleItems.length + 1).toString().padStart(3, '0');
        breakItem.day = day.id;
        breakItem.duration = day.breaks[breakIndex].duration;
        breakItem.name = day.breaks[breakIndex].name;
        breakItem.startTime = day.breaks[breakIndex].startTime;
        breakItem.isMatch = false;
        item.tournamentId = schedule.tournamentId;
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

export function useScheduleValidator(
  schedule: EventSchedule
): ScheduleValidator {
  const maxTotalMatches = Math.ceil(
    (schedule.teamsParticipating * schedule.matchesPerTeam) /
      (schedule.teamsPerAlliance * 2)
  );
  const remainingMatches =
    maxTotalMatches +
    schedule.days
      .map((d) => d.scheduledMatches)
      .reduce((prev, curr) => prev + curr);
  let participantsSelected = true;
  let allMatchesScheduled = true;
  let daysAreAfterEachOther = true;
  let daysHaveAtLeastOneMatch = true;
  let previousDayStart = moment(schedule.days[0].startTime).subtract(1, 'days');
  let validationMessage = '';
  for (const day of schedule.days) {
    if (!day.startTime.isAfter(previousDayStart, 'day')) {
      daysAreAfterEachOther = false;
    }
    if (day.scheduledMatches <= 0) {
      daysHaveAtLeastOneMatch = false;
    }
    previousDayStart = moment(day.startTime);
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
  if (
    typeof schedule.teams === 'undefined' ||
    schedule.teams.length < schedule.teamsPerAlliance
  ) {
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
