/**
 * Regression tests for the consolidated ordered-show model
 * (base/GraphicsShow.ts): the pure identity, ordering, and entry-status
 * derivation that the API, its database migration, and the producer app all
 * share. A defect here either loses an operator's show order or reports a
 * broken entry as cueable.
 *
 * Placed under seasons/stats/tests (not base/tests) because the package
 * `test` script globs only `build/seasons/stats/tests/*.test.js` -- see
 * libs/models/package.json.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCER_SHOW_RUNDOWN_ID,
  describeRundownEntries,
  emptyProducerShow,
  normalizeShowEntries,
  queueEntriesFromShow,
  showEntriesFromQueue,
  type RundownEntry
} from '../../../base/GraphicsShow.js';
import { rundownZod, type Timeline } from '../../../base/Graphics.js';
import type { QueueEntry } from '../../../base/GraphicsQueue.js';

type TimelineLike = Pick<Timeline, 'name' | 'items' | 'variables'> & {
  timelineId: string;
};

const timeline = (
  timelineId: string,
  overrides: Partial<TimelineLike> = {}
): TimelineLike => ({
  timelineId,
  name: `Timeline ${timelineId}`,
  items: [
    {
      id: `${timelineId}-item`,
      title: 'Score',
      stat: 'A1',
      selectors: {},
      filters: {},
      params: {},
      kind: 'stat-tile',
      mode: 'fullscreen',
      options: {}
    }
  ],
  ...overrides
});

test('empty producer show: a valid, revision-0 rundown under the well-known id', () => {
  const show = emptyProducerShow('event-a', '2026-09-14T12:00:00.000Z');
  assert.doesNotThrow(() => rundownZod.parse(show));
  assert.equal(show.rundownId, PRODUCER_SHOW_RUNDOWN_ID);
  assert.equal(show.eventKey, 'event-a');
  assert.equal(show.revision, 0);
  assert.deepEqual(show.entries, []);
});

test('queue projection: order, entry ids, timeline ids, values and notes all survive', () => {
  const queue: QueueEntry[] = [
    {
      entryId: 'entry-1',
      timelineId: 'timeline-a',
      values: { featured: 1114 },
      note: 'Blue spotlight'
    },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {} },
    { entryId: 'entry-3', timelineId: 'timeline-a', values: { featured: 254 } }
  ];
  const entries = showEntriesFromQueue(queue);
  assert.deepEqual(
    entries.map((e) => e.entryId),
    ['entry-1', 'entry-2', 'entry-3']
  );
  assert.deepEqual(entries[0], {
    entryId: 'entry-1',
    timelineId: 'timeline-a',
    values: { featured: 1114 },
    note: 'Blue spotlight'
  });
  // An empty values map is omitted, so a migrated entry is byte-identical to
  // one the producer app writes today.
  assert.deepEqual(entries[1], {
    entryId: 'entry-2',
    timelineId: 'timeline-b'
  });
  assert.deepEqual(entries[2].values, { featured: 254 });
  assert.doesNotThrow(() =>
    rundownZod.parse({
      schemaVersion: 2,
      revision: 0,
      rundownId: PRODUCER_SHOW_RUNDOWN_ID,
      eventKey: 'event-a',
      name: 'Producer Show',
      entries,
      updatedAtUtc: '2026-09-14T12:00:00.000Z'
    })
  );
});

test('queue projection: a duplicate entry id is suffixed, never dropped', () => {
  const entries = showEntriesFromQueue([
    { entryId: 'dup', timelineId: 'timeline-a', values: { featured: 1 } },
    { entryId: 'dup', timelineId: 'timeline-b', values: { featured: 2 } },
    { entryId: 'dup', timelineId: 'timeline-c', values: { featured: 3 } }
  ]);
  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((e) => e.entryId),
    ['dup', 'dup-2', 'dup-3']
  );
  // The queued RUN each id belonged to is what matters, and it is intact.
  assert.deepEqual(
    entries.map((e) => e.timelineId),
    ['timeline-a', 'timeline-b', 'timeline-c']
  );
});

test('normalize: an id that is not a valid identifier is replaced positionally', () => {
  const entries = normalizeShowEntries([
    { entryId: 'ok-1', timelineId: 'timeline-a' },
    { entryId: 'not a valid id', timelineId: 'timeline-b' }
  ] as RundownEntry[]);
  assert.equal(entries[0].entryId, 'ok-1');
  assert.equal(entries[1].entryId, 'entry-2');
  assert.equal(entries[1].timelineId, 'timeline-b');
});

test('queue read adapter: the round trip back to queue shape restores an explicit empty values map', () => {
  const show = rundownZod.parse({
    schemaVersion: 2,
    revision: 4,
    rundownId: PRODUCER_SHOW_RUNDOWN_ID,
    eventKey: 'event-a',
    name: 'Producer Show',
    entries: [
      { entryId: 'entry-1', timelineId: 'timeline-a', values: { x: 7 } },
      { entryId: 'entry-2', timelineId: 'timeline-b', note: 'n' }
    ],
    updatedAtUtc: '2026-09-14T12:00:00.000Z'
  });
  assert.deepEqual(queueEntriesFromShow(show), [
    { entryId: 'entry-1', timelineId: 'timeline-a', values: { x: 7 } },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {}, note: 'n' }
  ]);
});

test('entry status: a deleted timeline yields an explicit missing-timeline entry in place, not a dropped row', () => {
  const views = describeRundownEntries(
    [
      { entryId: 'entry-1', timelineId: 'timeline-a' },
      { entryId: 'entry-2', timelineId: 'deleted-timeline' },
      { entryId: 'entry-3', timelineId: 'timeline-a' }
    ],
    [timeline('timeline-a')]
  );
  assert.equal(views.length, 3);
  assert.deepEqual(
    views.map((v) => v.entryId),
    ['entry-1', 'entry-2', 'entry-3']
  );
  assert.equal(views[1].status, 'missing-timeline');
  assert.equal(views[1].timelineName, 'deleted-timeline');
  assert.equal(views[1].itemCount, 0);
  assert.equal(views[0].status, 'ready');
  assert.equal(views[2].status, 'ready');
});

test('entry status: an empty timeline and an unfilled variable are distinct, actionable states', () => {
  const views = describeRundownEntries(
    [
      { entryId: 'empty', timelineId: 'timeline-empty' },
      { entryId: 'unfilled', timelineId: 'timeline-templated' },
      {
        entryId: 'filled',
        timelineId: 'timeline-templated',
        values: { featured: 1114, opponent: 254 }
      }
    ],
    [
      timeline('timeline-empty', { items: [] }),
      timeline('timeline-templated', {
        variables: [
          { name: 'featured', kind: 'team' },
          { name: 'opponent', kind: 'team' }
        ]
      })
    ]
  );
  assert.equal(views[0].status, 'empty-timeline');
  assert.equal(views[1].status, 'missing-values');
  assert.deepEqual(views[1].missingValues, ['featured', 'opponent']);
  assert.equal(views[2].status, 'ready');
  assert.deepEqual(views[2].missingValues, []);
});

test('entry status: before the timeline list loads, nothing is reported ready', () => {
  const views = describeRundownEntries(
    [{ entryId: 'entry-1', timelineId: 'timeline-a' }],
    undefined
  );
  assert.equal(views[0].status, 'missing-timeline');
});
