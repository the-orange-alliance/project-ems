import { DateTime } from 'luxon';
import {
  Day,
  ScheduleItem,
  ScheduleParams,
  calculateTotalMatches,
  defaultScheduleItem
} from './Schedule.js';

const MS_PER_MINUTE = 60_000;

/** Parses an ISO string to epoch milliseconds; NaN when it isn't a valid time. */
const toMs = (iso: string): number => DateTime.fromISO(iso).toMillis();

const clock = (ms: number): string =>
  DateTime.fromMillis(ms).toFormat('h:mm a');

/** Times below are epoch milliseconds. */
export type TimelineEntry =
  | { type: 'match'; start: number }
  | {
      type: 'break';
      /** Position of the break in `day.breaks`. */
      breakIndex: number;
      start: number;
      end: number;
    };

export interface DayTimeline {
  /** Matches and breaks in the order they happen. */
  entries: TimelineEntry[];
  matchCount: number;
  /** When the last match finishes; the day's start when it has none. */
  end: number;
}

/**
 * Lays out one day. Matches play in rounds of `matchConcurrency` matches, one
 * round per cycle, as many as fit between the day's start and end (up to
 * `maxMatches`). A break begins at the first gap between rounds on or after its
 * requested time, so no match is cut short; breaks that come due together run
 * back to back, and a break with no match after it is left out.
 */
export function layoutDay(
  schedule: ScheduleParams,
  day: Day,
  maxMatches = Infinity
): DayTimeline {
  const concurrency = Math.max(1, Math.floor(schedule.matchConcurrency) || 1);
  const cycle = Math.max(1, schedule.cycleTime || 0) * MS_PER_MINUTE;
  const dayStart = toMs(day.startTime);
  const dayEnd = toMs(day.endTime);
  const entries: TimelineEntry[] = [];
  // Also false for an invalid (NaN) time.
  if (!(dayEnd > dayStart)) return { entries, matchCount: 0, end: dayStart };

  const breaks = day.breaks
    .map((dayBreak, breakIndex) => ({
      breakIndex,
      requested: toMs(dayBreak.startTime),
      length: Math.max(0, dayBreak.duration || 0) * MS_PER_MINUTE
    }))
    .filter((dayBreak) => !Number.isNaN(dayBreak.requested))
    .sort((a, b) => a.requested - b.requested || a.breakIndex - b.breakIndex);

  let roundStart = dayStart;
  let matchCount = 0;
  let nextBreak = 0;
  while (matchCount < maxMatches) {
    let cursor = roundStart;
    let due = nextBreak;
    const dueEntries: TimelineEntry[] = [];
    while (due < breaks.length && breaks[due].requested <= cursor) {
      const { breakIndex, length } = breaks[due++];
      dueEntries.push({
        type: 'break',
        breakIndex,
        start: cursor,
        end: cursor + length
      });
      cursor += length;
    }
    if (cursor + cycle > dayEnd) break;

    entries.push(...dueEntries);
    nextBreak = due;
    const roundSize = Math.min(concurrency, maxMatches - matchCount);
    for (let i = 0; i < roundSize; i++) {
      entries.push({ type: 'match', start: cursor });
    }
    matchCount += roundSize;
    roundStart = cursor + cycle;
  }
  return {
    entries,
    matchCount,
    end: matchCount > 0 ? roundStart : dayStart
  };
}

export interface DayPlan {
  /** Matches that fit in the day's window. */
  capacity: number;
  /** The matches actually placed, which is fewer once the total is reached. */
  timeline: DayTimeline;
}

export interface SchedulePlan {
  /** Matches the tournament needs. */
  total: number;
  days: DayPlan[];
  /** Matches that don't fit in any day. */
  unscheduled: number;
}

/** Fills the days in order, each with as many of the remaining matches as fit. */
export function planSchedule(schedule: ScheduleParams): SchedulePlan {
  const total = calculateTotalMatches(schedule);
  let remaining = total;
  const days = schedule.days.map((day): DayPlan => {
    const full = layoutDay(schedule, day);
    const timeline =
      full.matchCount <= remaining ? full : layoutDay(schedule, day, remaining);
    remaining -= timeline.matchCount;
    return { capacity: full.matchCount, timeline };
  });
  return { total, days, unscheduled: remaining };
}

/** Roughly how much longer the days need to be to fit the unscheduled matches. */
export function getExtraMinutesNeeded(
  schedule: ScheduleParams,
  plan: SchedulePlan
): number {
  const concurrency = Math.max(1, Math.floor(schedule.matchConcurrency) || 1);
  const rounds = Math.ceil(plan.unscheduled / concurrency);
  return rounds * Math.max(1, schedule.cycleTime || 0);
}

export function generateScheduleItems(
  schedule: ScheduleParams,
  plan = planSchedule(schedule)
): ScheduleItem[] {
  const { eventKey, tournamentKey, type, cycleTime } = schedule;
  const scheduleItems: ScheduleItem[] = [];
  let matchNumber = 0;
  plan.days.forEach(({ timeline }, day) => {
    for (const entry of timeline.entries) {
      const dayBreak =
        entry.type === 'break'
          ? schedule.days[day].breaks[entry.breakIndex]
          : null;
      if (!dayBreak) matchNumber++;
      scheduleItems.push({
        ...defaultScheduleItem,
        eventKey,
        tournamentKey,
        type,
        id: scheduleItems.length,
        day,
        name: dayBreak ? dayBreak.name : `${type} Match ${matchNumber}`,
        duration: dayBreak ? dayBreak.duration : cycleTime,
        startTime: DateTime.fromMillis(entry.start).toISO() ?? '',
        isMatch: !dayBreak
      });
    }
  });
  return scheduleItems;
}

export type IssueSeverity = 'error' | 'warning';

export interface ScheduleIssue {
  severity: IssueSeverity;
  message: string;
  /** Index into `days` when the issue belongs to a single day. */
  dayIndex?: number;
  /** Index into that day's `breaks` when the issue belongs to a single break. */
  breakIndex?: number;
}

/** Everything worth telling the user about; only errors stop generation. */
export function getScheduleIssues(
  schedule: ScheduleParams,
  plan = planSchedule(schedule)
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const error = (message: string, where: Partial<ScheduleIssue> = {}) =>
    issues.push({ severity: 'error', message, ...where });
  const warning = (message: string, where: Partial<ScheduleIssue> = {}) =>
    issues.push({ severity: 'warning', message, ...where });

  if (schedule.teamKeys.length <= 0) {
    error('There are not enough teams for this schedule.');
  }
  if (schedule.days.length <= 0) {
    error('At least 1 day of competition must be scheduled.');
    return issues;
  }
  if (plan.unscheduled > 0) {
    const placed = plan.total - plan.unscheduled;
    error(
      `The days only have room for ${placed} of ${plan.total} matches. Make the days about ${getExtraMinutesNeeded(schedule, plan)} minutes longer, or add a day.`
    );
  }

  schedule.days.forEach((day, dayIndex) => {
    const label = `Day ${dayIndex + 1}`;
    const dayStart = toMs(day.startTime);
    const dayEnd = toMs(day.endTime);
    const here = { dayIndex };
    if (Number.isNaN(dayStart) || Number.isNaN(dayEnd)) {
      error(`${label} needs a valid start and end time.`, here);
      return;
    }
    if (dayEnd <= dayStart) {
      error(`${label} must end after it starts.`, here);
      return;
    }
    const previousEnd =
      dayIndex > 0 ? toMs(schedule.days[dayIndex - 1].endTime) : NaN;
    if (dayStart < previousEnd) {
      error(`${label} starts before day ${dayIndex} ends.`, here);
    }

    const { capacity, timeline } = plan.days[dayIndex];
    if (capacity === 0) {
      error(`${label} is too short to fit a match.`, here);
    } else if (timeline.matchCount === 0) {
      warning(
        `${label} isn't needed: every match fits in the earlier days.`,
        here
      );
    }

    const placedBreaks = new Set(
      timeline.entries.flatMap((e) =>
        e.type === 'break' ? [e.breakIndex] : []
      )
    );
    day.breaks.forEach((dayBreak, breakIndex) => {
      const where = { dayIndex, breakIndex };
      const start = toMs(dayBreak.startTime);
      const end = start + (dayBreak.duration || 0) * MS_PER_MINUTE;
      if (Number.isNaN(start)) {
        error(`${label}: break "${dayBreak.name}" needs a valid time.`, where);
        return;
      }
      if (start < dayStart || end > dayEnd) {
        error(
          `${label}: break "${dayBreak.name}" must fall between ${clock(dayStart)} and ${clock(dayEnd)}.`,
          where
        );
        return;
      }
      const overlapsEarlier = day.breaks.some((other, otherIndex) => {
        const otherStart = toMs(other.startTime);
        return (
          otherIndex < breakIndex &&
          otherStart < end &&
          start < otherStart + (other.duration || 0) * MS_PER_MINUTE
        );
      });
      if (overlapsEarlier) {
        warning(
          `${label}: break "${dayBreak.name}" overlaps another break, so it runs right after it.`,
          where
        );
      } else if (timeline.matchCount > 0 && !placedBreaks.has(breakIndex)) {
        warning(
          `${label}: break "${dayBreak.name}" comes after the last match, so it isn't needed.`,
          where
        );
      }
    });
  });
  return issues;
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

  const plan = planSchedule(schedule);
  const firstError = getScheduleIssues(schedule, plan).find(
    (issue) => issue.severity === 'error'
  );
  return {
    maxTotalMatches: plan.total,
    remainingMatches: plan.unscheduled,
    valid: !firstError,
    validationMessage: firstError?.message ?? ''
  };
}

/** Re-numbers days and breaks and brings their derived fields up to date. */
export function normalizeScheduleDays(
  schedule: ScheduleParams
): ScheduleParams {
  const numbered = {
    ...schedule,
    days: schedule.days.map((day, id) => ({
      ...day,
      id,
      breaks: day.breaks.map((dayBreak, i) => ({
        ...dayBreak,
        id: i,
        endTime:
          DateTime.fromISO(dayBreak.startTime)
            .plus({ minutes: dayBreak.duration })
            .toISO() ?? dayBreak.endTime
      }))
    }))
  };
  const { days } = planSchedule(numbered);
  return {
    ...numbered,
    days: numbered.days.map((day, i) => ({
      ...day,
      scheduledMatches: days[i].timeline.matchCount
    }))
  };
}
