import { Match } from '@toa-lib/models';
import { describe, expect, it } from 'vitest';
import { analyzeSchedule, getScheduleStatus } from './schedule-status.js';

const BASE = Date.parse('2026-10-07T10:00:00.000Z');
const MS_PER_MINUTE = 60_000;
const at = (minutes: number) => BASE + minutes * MS_PER_MINUTE;
const iso = (minutes: number) => new Date(at(minutes)).toISOString();

/** A match scheduled at `scheduled` minutes; unstarted when `started` is omitted. */
const makeMatch = (
  id: number,
  scheduled: number,
  started?: number,
  extra: Partial<Match<any>> = {}
) =>
  ({
    id,
    scheduledTime: iso(scheduled),
    actualStartTime: started === undefined ? '' : iso(started),
    prestartTime: '',
    result: started === undefined ? -1 : 1,
    ...extra
  }) as Match<any>;

const statusAt = (matches: Match<any>[], now: number) =>
  getScheduleStatus(analyzeSchedule(matches), at(now));

describe('schedule offset', () => {
  const matches = [makeMatch(1, 38, 38), makeMatch(2, 43)];

  it('is ahead when the next match is still in the future', () => {
    expect(statusAt(matches, 40).offsetMinutes).toBe(3);
  });

  it('is behind once the next match is overdue', () => {
    expect(statusAt(matches, 50).offsetMinutes).toBe(-7);
  });

  it('follows the clock down to the second', () => {
    expect(statusAt(matches, 40.5).offsetMinutes).toBeCloseTo(2.5);
  });

  it('picks the first unstarted match by scheduled time, not by id', () => {
    const status = statusAt([makeMatch(9, 20), makeMatch(2, 30)], 10);
    expect(status.nextMatch?.id).toBe(9);
  });

  it('skips matches that were already played without a recorded start', () => {
    const played = makeMatch(1, 10, undefined, { result: 1 });
    expect(statusAt([played, makeMatch(2, 15)], 12).nextMatch?.id).toBe(2);
  });

  it('has no offset when every match has started', () => {
    const status = statusAt([makeMatch(1, 0, 0), makeMatch(2, 5, 5)], 9);
    expect(status.nextMatch).toBeNull();
    expect(status.offsetMinutes).toBeNull();
  });

  it('ignores matches without a usable scheduled time', () => {
    const broken = makeMatch(1, 0, undefined, { scheduledTime: '' });
    expect(statusAt([broken, makeMatch(2, 5)], 0).nextMatch?.id).toBe(2);
  });
});

describe('cycle times', () => {
  it('measures the gap between consecutive match starts', () => {
    const matches = [
      makeMatch(1, 0, 0),
      makeMatch(2, 5, 5),
      makeMatch(3, 10, 11),
      makeMatch(4, 15, 15),
      makeMatch(5, 20)
    ];
    const { cycleTimes } = statusAt(matches, 17);
    expect(cycleTimes.count).toBe(3);
    expect(cycleTimes.average).toBeCloseTo(5);
    expect(cycleTimes.last).toBeCloseTo(4);
    expect(cycleTimes.scheduled).toBeCloseTo(5);
  });

  it('averages only the latest cycles for the recent average', () => {
    // Cycles of 10, then six of 5 minutes.
    const starts = [0, 10, 15, 20, 25, 30, 35];
    const matches = starts.map((start, i) => makeMatch(i + 1, i * 5, start));
    const { cycleTimes } = statusAt(matches, 40);
    expect(cycleTimes.recentAverage).toBeCloseTo(5);
    expect(cycleTimes.average).toBeCloseTo(35 / 6);
  });

  it('counts matches played side by side as one round', () => {
    const matches = [
      makeMatch(1, 0, 0),
      makeMatch(2, 0, 1),
      makeMatch(3, 10, 10),
      makeMatch(4, 10, 12)
    ];
    const { cycleTimes } = statusAt(matches, 15);
    expect(cycleTimes.count).toBe(1);
    expect(cycleTimes.last).toBeCloseTo(10);
  });

  it('leaves out gaps the schedule planned as breaks', () => {
    const matches = [
      makeMatch(1, 0, 0),
      makeMatch(2, 5, 5),
      makeMatch(3, 65, 66),
      makeMatch(4, 70, 71)
    ];
    const { cycleTimes } = statusAt(matches, 80);
    expect(cycleTimes.count).toBe(2);
    expect(cycleTimes.average).toBeCloseTo(5);
  });

  it('has nothing to report until two rounds have started', () => {
    const { cycleTimes } = statusAt([makeMatch(1, 0, 0), makeMatch(2, 5)], 3);
    expect(cycleTimes.count).toBe(0);
    expect(cycleTimes.average).toBeNull();
    expect(cycleTimes.last).toBeNull();
  });

  it('averages prestart to start for started matches', () => {
    const matches = [
      makeMatch(1, 0, 0, { prestartTime: iso(-2) }),
      makeMatch(2, 5, 5, { prestartTime: iso(3) }),
      makeMatch(3, 10)
    ];
    expect(statusAt(matches, 8).cycleTimes.averagePrestartToStart).toBeCloseTo(
      2
    );
  });

  it('ignores a prestart from long before the match actually started', () => {
    const stale = makeMatch(1, 0, 0, { prestartTime: iso(-120) });
    expect(
      statusAt([stale, makeMatch(2, 5)], 3).cycleTimes.averagePrestartToStart
    ).toBeNull();
  });
});

describe('current cycle time', () => {
  const matches = [
    makeMatch(1, 0, 0),
    makeMatch(2, 5, 5),
    makeMatch(3, 10, 11),
    makeMatch(4, 15)
  ];

  it('is the time since the last match started', () => {
    expect(statusAt(matches, 14).cycleTimes.current).toBeCloseTo(3);
  });

  it('keeps growing while the next match is late', () => {
    expect(statusAt(matches, 19).cycleTimes.current).toBeCloseTo(8);
  });

  it('is not reported across a planned break', () => {
    const beforeLunch = [
      makeMatch(1, 0, 0),
      makeMatch(2, 5, 5),
      makeMatch(3, 65)
    ];
    expect(statusAt(beforeLunch, 30).cycleTimes.current).toBeNull();
  });

  it('is not reported before any match has started', () => {
    expect(
      statusAt([makeMatch(1, 0), makeMatch(2, 5)], 1).cycleTimes.current
    ).toBeNull();
  });
});
