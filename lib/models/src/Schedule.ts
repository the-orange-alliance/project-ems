import { DateTime } from 'luxon';
import { Team } from './Team.js';
import { isArray, isNonNullObject, isNumber, isString } from './types.js';

const FGC_PREMIERE_CYCLE_TIME = 7;
const FGC_SIDE_FIELDS_CYCLE_TIME = 7;

export type TournamentType =
  | 'Test'
  | 'Practice'
  | 'Qualification'
  | 'Round Robin'
  | 'Ranking'
  | 'Eliminations'
  | 'Finals';

export const TournamentTypes: TournamentType[] = [
  'Finals',
  'Eliminations',
  'Practice',
  'Qualification',
  'Ranking',
  'Round Robin',
  'Test'
];

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
  startTime: DateTime.now().toISO(),
  endTime: DateTime.now().toISO(),
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
  startTime: DateTime.now().toISO(),
  endTime: DateTime.now().toISO(),
  scheduledMatches: 0,
  breaks: []
};

export interface ScheduleItem {
  key: string;
  name: string;
  type: TournamentType;
  day: number;
  startTime: string;
  duration: number;
  isMatch: boolean;
  tournamentId: number;
}

export const defaultScheduleItem: ScheduleItem = {
  key: '',
  name: '',
  type: 'Test',
  day: 0,
  startTime: DateTime.now().toISO(),
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
  isNumber(obj.tournamentId);

export const isScheduleItemArray = (obj: unknown): obj is ScheduleItem[] =>
  isArray(obj) && obj.every((o) => isScheduleItem(o));

export interface EventSchedule {
  type: TournamentType;
  days: Day[];
  matchConcurrency: number;
  teams: Team[];
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
  teamsPerAlliance: 3,
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
      const item: ScheduleItem = Object.assign({}, defaultScheduleItem);
      const breakIndex = matchBreaks.indexOf(dayMatches + 1);
      item.type = schedule.type;
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
      item.startTime = DateTime.fromISO(day.startTime)
        .plus({
          minutes:
            Math.ceil(matchIndex / schedule.matchConcurrency) *
              schedule.cycleTime +
            breakPadding
        })
        .toISO();
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

export function generateScheduleWithPremiereField(
  oldSchedule: EventSchedule,
  eventKey: string
): ScheduleItem[] {
  const items = generateScheduleItems(oldSchedule, eventKey);
  const schedule = JSON.parse(JSON.stringify(oldSchedule));
  let index = 0;
  let normalIndex = 0;
  let premiereIndex = 0;
  let [prevItem] = items;
  let breakPadding = 0;
  let breakIndex = 0;

  let needsBufferMatch = false;
  let bufferCount = 0;
  let dayPremiereTime = 0;
  let dayNormalTime = 0;
  for (const item of items) {
    if (prevItem.day !== item.day) {
      schedule.days[prevItem.day].endTime = DateTime.fromISO(prevItem.startTime)
        .plus({ minutes: prevItem.duration })
        .toISO();
      premiereIndex = 0;
      normalIndex = 0;
      index = 0;
      breakPadding = 0;
      breakIndex = 0;
      dayPremiereTime = 0;
      dayNormalTime = 0;
      needsBufferMatch = false;
    }

    if (item.isMatch) {
      // For all matches that are NOT on the final day. FIRST GLOBAL ONLY.
      if (
        item.day + 1 === schedule.days.length &&
        schedule.type === 'Qualification'
      ) {
        item.duration = FGC_SIDE_FIELDS_CYCLE_TIME;
        item.startTime = schedule.days[item.day].startTime
          .add(7 * premiereIndex + breakPadding, 'minutes')
          .toISOString();
        index++;
        if (index % 3 === 0) {
          index = 0;
          premiereIndex++;
        }
        // TODO - Test and make sure this reflects on the fields.
      } else {
        if (!needsBufferMatch) {
          if (index % 7 < 4) {
            item.duration = FGC_PREMIERE_CYCLE_TIME;
            item.startTime = DateTime.fromISO(schedule.days[item.day].startTime)
              .plus({ minutes: 10 * normalIndex + breakPadding })
              .toISO();
            dayNormalTime += item.duration / 2;
            // console.log("CREATING NORMAL MATCH", index, item.duration, dayPremiereTime, dayNormalTime);
          } else {
            item.duration = FGC_SIDE_FIELDS_CYCLE_TIME;
            item.startTime = DateTime.fromISO(schedule.days[item.day].startTime)
              .plus({ minutes: item.duration * premiereIndex + breakPadding })
              .toISO();
            dayPremiereTime += item.duration;
            premiereIndex++;
            // console.log("CREATING PREMIERE MATCH", index, item.duration, dayPremiereTime, dayNormalTime);
          }
          if (index % 7 === 1) {
            normalIndex++;
          }
          if (index % 7 === 6) {
            // console.log("NEW MATCH PAIRS");
            index = 0;
            normalIndex++;
            bufferCount = 0;
            needsBufferMatch =
              dayPremiereTime - dayNormalTime === FGC_PREMIERE_CYCLE_TIME;
          } else {
            index++;
          }
        } else {
          // console.log("BUFFER MATCH");
          item.duration = FGC_PREMIERE_CYCLE_TIME;
          item.startTime = DateTime.fromISO(schedule.days[item.day].startTime)
            .plus({ minutes: item.duration * normalIndex + breakPadding })
            .toISO();
          dayPremiereTime = 0;
          dayNormalTime = 0;
          bufferCount++;
          needsBufferMatch = bufferCount < 2;
          if (!needsBufferMatch) {
            normalIndex++;
          }
        }
      }
    } else {
      const thisBreak = schedule.days[item.day].breaks[breakIndex];
      schedule.days[item.day].breaks[breakIndex].startTime = DateTime.fromISO(
        prevItem.startTime
      ).plus({ minutes: prevItem.duration });
      schedule.days[item.day].breaks[breakIndex].endTime = DateTime.fromISO(
        thisBreak.startTime
      ).plus({ minutes: thisBreak.duration });
      breakPadding += item.duration;
      breakIndex++;
    }
    prevItem = item;
  }
  if (items.length > 0) {
    schedule.days[prevItem.day].endTime = DateTime.fromISO(
      prevItem.startTime
    ).plus({ minutes: prevItem.duration });
  }
  return items;
}

export function generateFGCRoundRobinSchedule(
  schedule: EventSchedule,
  eventKey: string
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (let i = 0; i < 16; i++) {
    items.push({
      day: 0,
      duration: schedule.cycleTime,
      isMatch: true,
      key:
        eventKey +
        '-' +
        schedule.type.substring(0, 1) +
        (schedule.tournamentId > -1 ? schedule.tournamentId : '') +
        (i + 1).toString().padStart(3, '0'),
      name: 'Match ' + (i + 1),
      startTime: DateTime.fromISO(schedule.days[0].startTime)
        .plus({ minutes: schedule.cycleTime * i })
        .toISO(),
      tournamentId: schedule.tournamentId,
      type: schedule.type
    });
  }
  return items;
}

export function generateFinalsSchedule(
  schedule: EventSchedule,
  eventKey: string
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (let i = 0; i < 3; i++) {
    items.push({
      day: 0,
      duration: schedule.cycleTime,
      isMatch: true,
      key:
        eventKey +
        '-' +
        schedule.type.substring(0, 1) +
        (schedule.tournamentId > -1 ? schedule.tournamentId : '') +
        (i + 1).toString().padStart(3, '0'),
      name: 'Match ' + (i + 1),
      startTime: DateTime.fromISO(schedule.days[0].startTime)
        .plus({ minutes: schedule.cycleTime * i })
        .toISO(),
      tournamentId: schedule.tournamentId,
      type: schedule.type
    });
  }
  return items;
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
  if (schedule.teamsParticipating <= 0) {
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

export function calculateTotalMatches(
  teamsParticipating: number,
  matchesPerTeam: number,
  teamsPerAlliance: number
): number {
  return Math.ceil(
    (teamsParticipating * matchesPerTeam) / (teamsPerAlliance * 2)
  );
}
