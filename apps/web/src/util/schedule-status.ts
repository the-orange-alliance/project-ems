import { Match, RESULT_NOT_PLAYED } from '@toa-lib/models';

const MS_PER_MINUTE = 60_000;

/** How many of the latest cycles feed the "recent" average. */
const RECENT_CYCLES = 5;

// A scheduled gap this many times the usual one is a planned break, not a cycle.
const BREAK_FACTOR = 1.5;

// A longer prestart-to-start gap is a stale prestart, not part of this match.
const MAX_PRESTART_MINUTES = 30;

/** All durations are in minutes; null when there isn't enough data yet. */
export interface CycleTimeStats {
  /** The gap the schedule plans between rounds of matches. */
  scheduled: number | null;
  /** How many cycles have been measured. */
  count: number;
  average: number | null;
  recentAverage: number | null;
  last: number | null;
  /** Time since the last round started: the cycle if the next match started now. */
  current: number | null;
  averagePrestartToStart: number | null;
}

export interface ScheduleStatus {
  /** The first scheduled match that hasn't started. */
  nextMatch: Match<any> | null;
  /** Minutes the next match is ahead (positive) or behind (negative) schedule. */
  offsetMinutes: number | null;
  cycleTimes: CycleTimeStats;
}

/** Everything that only changes when a match does; combine with a clock for the status. */
export interface ScheduleAnalysis {
  nextMatch: Match<any> | null;
  /** When the last round started, if the next match follows it without a planned break. */
  currentCycleSince: number | null;
  cycleTimes: Omit<CycleTimeStats, 'current'>;
}

const toMs = (iso: string | undefined): number => (iso ? Date.parse(iso) : NaN);

const mean = (values: number[]): number | null =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

interface Round {
  scheduled: number;
  /** Earliest actual start among the round's matches; null until one starts. */
  started: number | null;
}

/**
 * Matches that share a scheduled time play at the same time on different
 * fields, so they form one round, and a cycle is the gap between rounds.
 */
const groupIntoRounds = (matches: Match<any>[]): Round[] => {
  const rounds = new Map<number, number | null>();
  for (const match of matches) {
    const scheduled = toMs(match.scheduledTime);
    const started = toMs(match.actualStartTime);
    const earliest = rounds.get(scheduled) ?? null;
    rounds.set(
      scheduled,
      Number.isFinite(started) && (earliest === null || started < earliest)
        ? started
        : earliest
    );
  }
  return [...rounds].map(([scheduled, started]) => ({ scheduled, started }));
};

export const analyzeSchedule = (matches: Match<any>[]): ScheduleAnalysis => {
  const scheduled = matches
    .filter((m) => Number.isFinite(toMs(m.scheduledTime)))
    .sort(
      (a, b) => toMs(a.scheduledTime) - toMs(b.scheduledTime) || a.id - b.id
    );
  const nextMatch =
    scheduled.find(
      (m) =>
        !Number.isFinite(toMs(m.actualStartTime)) &&
        m.result <= RESULT_NOT_PLAYED
    ) ?? null;

  const rounds = groupIntoRounds(scheduled);
  const usualGap = median(
    rounds
      .slice(1)
      .map((round, i) => round.scheduled - rounds[i].scheduled)
      .filter((gap) => gap > 0)
  );
  const isPlannedBreak = (gap: number) =>
    usualGap !== null && gap > usualGap * BREAK_FACTOR;

  const started = rounds
    .filter(
      (round): round is Round & { started: number } => round.started !== null
    )
    .sort((a, b) => a.started - b.started);
  const cycles = started.flatMap((round, i) => {
    if (i === 0) return [];
    const actual = (round.started - started[i - 1].started) / MS_PER_MINUTE;
    const planned = round.scheduled - started[i - 1].scheduled;
    return actual > 0 && !isPlannedBreak(planned) ? [actual] : [];
  });

  const prestartGaps = scheduled.flatMap((match) => {
    const gap =
      (toMs(match.actualStartTime) - toMs(match.prestartTime)) / MS_PER_MINUTE;
    return gap >= 0 && gap <= MAX_PRESTART_MINUTES ? [gap] : [];
  });

  const lastRound = started.at(-1);
  const followsWithoutBreak =
    lastRound !== undefined &&
    nextMatch !== null &&
    !isPlannedBreak(toMs(nextMatch.scheduledTime) - lastRound.scheduled);

  return {
    nextMatch,
    currentCycleSince: followsWithoutBreak ? lastRound.started : null,
    cycleTimes: {
      scheduled: usualGap === null ? null : usualGap / MS_PER_MINUTE,
      count: cycles.length,
      average: mean(cycles),
      recentAverage: mean(cycles.slice(-RECENT_CYCLES)),
      last: cycles.at(-1) ?? null,
      averagePrestartToStart: mean(prestartGaps)
    }
  };
};

export const getScheduleStatus = (
  analysis: ScheduleAnalysis,
  now: number
): ScheduleStatus => {
  const { nextMatch, currentCycleSince, cycleTimes } = analysis;
  return {
    nextMatch,
    offsetMinutes: nextMatch
      ? (toMs(nextMatch.scheduledTime) - now) / MS_PER_MINUTE
      : null,
    cycleTimes: {
      ...cycleTimes,
      current:
        currentCycleSince === null
          ? null
          : (now - currentCycleSince) / MS_PER_MINUTE
    }
  };
};
