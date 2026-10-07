import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  Day,
  DayBreak,
  ScheduleParams,
  defaultBreak,
  defaultDay,
  defaultScheduleParams
} from '../Schedule.js';
import {
  DayTimeline,
  generateScheduleItems,
  getScheduleIssues,
  getScheduleValidation,
  layoutDay,
  normalizeScheduleDays,
  planSchedule
} from '../ScheduleTimeline.js';

const BASE = DateTime.fromISO('2026-10-07T09:00:00.000Z').toMillis();
const iso = (minutes: number) =>
  DateTime.fromMillis(BASE + minutes * 60_000).toISO() ?? '';
const minute = (ms: number) => (ms - BASE) / 60_000;

const makeBreak = (id: number, at: number, duration: number): DayBreak => ({
  ...defaultBreak,
  id,
  name: `Break ${id}`,
  startTime: iso(at),
  endTime: iso(at + duration),
  duration
});

const makeDay = (from: number, to: number, breaks: DayBreak[] = []): Day => ({
  ...defaultDay,
  startTime: iso(from),
  endTime: iso(to),
  breaks
});

// 12 teams x 3 matches / 6 per match = 6 matches, one every 5 minutes.
const makeSchedule = (
  days: Day[],
  overrides: Partial<ScheduleParams> = {}
): ScheduleParams => ({
  ...defaultScheduleParams,
  eventKey: 'event',
  tournamentKey: 'tournament',
  type: 'Qualification',
  cycleTime: 5,
  matchConcurrency: 1,
  matchesPerTeam: 3,
  teamKeys: Array.from({ length: 12 }, (_, i) => i + 1),
  days,
  ...overrides
});

const summarize = ({ entries }: DayTimeline) =>
  entries.map((e) => `${e.type === 'match' ? 'M' : 'B'}@${minute(e.start)}`);

const DAY_LENGTH = 24 * 60;

test('a day holds as many matches as fit between its start and end', () => {
  const timeline = layoutDay(makeSchedule([]), makeDay(0, 120));
  assert.equal(timeline.matchCount, 24);
  assert.equal(minute(timeline.end), 120);
});

test('a match that would run past the day end is left out', () => {
  const timeline = layoutDay(makeSchedule([]), makeDay(0, 12));
  assert.equal(timeline.matchCount, 2);
  assert.equal(minute(timeline.end), 10);
});

test('concurrent matches fill whole rounds', () => {
  const schedule = makeSchedule([], { matchConcurrency: 2 });
  assert.equal(layoutDay(schedule, makeDay(0, 20)).matchCount, 8);
});

test('a break delays the matches after it and costs room in the day', () => {
  const timeline = layoutDay(
    makeSchedule([]),
    makeDay(0, 60, [makeBreak(0, 30, 10)])
  );
  assert.deepEqual(summarize(timeline), [
    'M@0',
    'M@5',
    'M@10',
    'M@15',
    'M@20',
    'M@25',
    'B@30',
    'M@40',
    'M@45',
    'M@50',
    'M@55'
  ]);
});

test('a break waits for the next gap between rounds', () => {
  const timeline = layoutDay(
    makeSchedule([], { cycleTime: 7 }),
    makeDay(0, 42, [makeBreak(0, 10, 7)])
  );
  assert.deepEqual(summarize(timeline), [
    'M@0',
    'M@7',
    'B@14',
    'M@21',
    'M@28',
    'M@35'
  ]);
});

test('several breaks each land at their own time', () => {
  const timeline = layoutDay(
    makeSchedule([]),
    makeDay(0, 120, [makeBreak(0, 30, 15), makeBreak(1, 70, 20)])
  );
  const labels = summarize(timeline);
  assert.ok(labels.includes('B@30'));
  assert.ok(labels.includes('B@70'));
  assert.equal(labels.at(-1), 'M@115');
});

test('breaks given out of order are still placed by time', () => {
  const timeline = layoutDay(
    makeSchedule([]),
    makeDay(0, 120, [makeBreak(0, 70, 20), makeBreak(1, 30, 15)])
  );
  const breaks = summarize(timeline).filter((l) => l.startsWith('B'));
  assert.deepEqual(breaks, ['B@30', 'B@70']);
});

test('overlapping breaks run back to back', () => {
  const timeline = layoutDay(
    makeSchedule([]),
    makeDay(0, 120, [makeBreak(0, 30, 30), makeBreak(1, 40, 10)])
  );
  const labels = summarize(timeline);
  assert.ok(labels.includes('B@30'));
  assert.ok(labels.includes('B@60'));
  assert.ok(labels.includes('M@70'));
});

test('a break after the last match is left out', () => {
  const timeline = layoutDay(
    makeSchedule([]),
    makeDay(0, 120, [makeBreak(0, 60, 15)]),
    3
  );
  assert.deepEqual(summarize(timeline), ['M@0', 'M@5', 'M@10']);
});

test('days fill in order and only the last needed day is partial', () => {
  const plan = planSchedule(
    makeSchedule([makeDay(0, 15), makeDay(DAY_LENGTH, DAY_LENGTH + 60)])
  );
  assert.deepEqual(
    plan.days.map((d) => d.timeline.matchCount),
    [3, 3]
  );
  assert.deepEqual(
    plan.days.map((d) => d.capacity),
    [3, 12]
  );
  assert.equal(plan.unscheduled, 0);
});

test('not enough room is reported with how much longer the days need to be', () => {
  const schedule = makeSchedule([makeDay(0, 15)]);
  const { valid, validationMessage, remainingMatches } =
    getScheduleValidation(schedule);
  assert.equal(valid, false);
  assert.equal(remainingMatches, 3);
  assert.match(validationMessage, /room for 3 of 6 matches/);
  assert.match(validationMessage, /15 minutes longer/);
});

test('an unneeded day is a warning, not an error', () => {
  const schedule = makeSchedule([
    makeDay(0, 120),
    makeDay(DAY_LENGTH, DAY_LENGTH + 120)
  ]);
  const issues = getScheduleIssues(schedule);
  assert.deepEqual(
    issues.map((i) => [i.severity, i.dayIndex]),
    [['warning', 1]]
  );
  assert.equal(getScheduleValidation(schedule).valid, true);
});

test('overlapping breaks only warn', () => {
  // 20 matches, so both breaks fall mid-day rather than after the last match.
  const schedule = makeSchedule(
    [makeDay(0, 150, [makeBreak(0, 30, 30), makeBreak(1, 40, 10)])],
    { matchesPerTeam: 10 }
  );
  const issues = getScheduleIssues(schedule);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warning');
  assert.equal(issues[0].breakIndex, 1);
});

test('a break outside the day is an error on that break', () => {
  const schedule = makeSchedule([makeDay(0, 120, [makeBreak(0, 110, 30)])]);
  const issue = getScheduleIssues(schedule).find((i) => i.severity === 'error');
  assert.equal(issue?.breakIndex, 0);
  assert.match(issue?.message ?? '', /must fall between/);
});

test('day times must be valid, ordered and not overlap', () => {
  const messages = (days: Day[]) =>
    getScheduleIssues(makeSchedule(days))
      .filter((i) => i.severity === 'error')
      .map((i) => i.message);
  assert.ok(
    messages([{ ...makeDay(0, 120), startTime: '' }]).some((m) =>
      /valid start and end time/.test(m)
    )
  );
  assert.ok(
    messages([makeDay(60, 30)]).some((m) => /must end after it starts/.test(m))
  );
  assert.ok(
    messages([makeDay(0, 120), makeDay(60, 180)]).some((m) =>
      /starts before day 1 ends/.test(m)
    )
  );
  assert.ok(
    messages([makeDay(0, 3)]).some((m) => /too short to fit a match/.test(m))
  );
});

test('generated items follow the plan, with breaks in between', () => {
  const items = generateScheduleItems(
    makeSchedule([makeDay(0, 40, [makeBreak(0, 15, 10)])], {
      type: 'Ranking'
    })
  );
  assert.deepEqual(
    items.map(
      (i) => `${i.isMatch ? 'M' : 'B'}@${minute(Date.parse(i.startTime))}`
    ),
    ['M@0', 'M@5', 'M@10', 'B@15', 'M@25', 'M@30', 'M@35']
  );
  assert.deepEqual(
    items.map((i) => i.id),
    [0, 1, 2, 3, 4, 5, 6]
  );
  assert.deepEqual(
    items.filter((i) => i.isMatch).map((i) => i.name),
    [1, 2, 3, 4, 5, 6].map((n) => `Ranking Match ${n}`)
  );
  assert.ok(items.every((i) => i.type === 'Ranking'));
});

test('normalizing numbers the days and fills in derived fields', () => {
  const schedule = makeSchedule([
    { ...makeDay(0, 15), id: 4 },
    {
      ...makeDay(DAY_LENGTH, DAY_LENGTH + 60),
      id: 9,
      breaks: [{ ...makeBreak(7, DAY_LENGTH + 30, 10), endTime: '' }]
    }
  ]);
  const [first, second] = normalizeScheduleDays(schedule).days;
  assert.deepEqual([first.id, second.id], [0, 1]);
  assert.deepEqual([first.scheduledMatches, second.scheduledMatches], [3, 3]);
  assert.equal(second.breaks[0].id, 0);
  assert.equal(minute(Date.parse(second.breaks[0].endTime)), DAY_LENGTH + 40);
});

test('zero teams per alliance yields no matches instead of Infinity', () => {
  const { maxTotalMatches } = getScheduleValidation(
    makeSchedule([makeDay(0, 60)], {
      options: { rounds: 1, teamsPerAlliance: 0 }
    })
  );
  assert.equal(maxTotalMatches, 0);
});
