import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import {
  presentationFrameZod,
  PRODUCER_SHOW_RUNDOWN_ID,
  type GraphicSpec,
  type Rundown,
  type ShowAdvanceResult
} from '@toa-lib/models/base';
import type {
  prepareGraphicFrame,
  StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import graphicsPlaybackController from '../controllers/GraphicsPlayback.js';
import { graphicsFixture, sampleGraphic } from './graphics-test-support.js';

/**
 * The atomic ordered-show operation: `POST /graphics/:eventKey/live/show/advance`.
 *
 * These are route-level integration tests against a real Fastify instance, a
 * real SQLite-backed `GraphicsRepository` and the real coordinator/navigation/
 * program modules (`graphicsFixture` + deterministic fake stats), because the
 * property under test is precisely that the rundown write and the playback
 * write land in ONE durable transaction. A unit test with a fake repository
 * would prove nothing about that.
 *
 * What the old browser sequence (`live.load` then a rundown PATCH) could not
 * do, one test each:
 *  - consume exactly once under retry / double invocation / effect replay;
 *  - never leave an entry both loaded and still queued (injected failure);
 *  - refuse a stale expected revision instead of consuming the wrong entry;
 *  - lose a race with a concurrent reorder rather than consuming position 1
 *    as the operator no longer sees it;
 *  - keep two events' shows completely separate.
 */

const NOW = '2026-01-01T00:00:00.000Z';

function fakeFrame(spec: GraphicSpec, asOfUtc: string) {
  return presentationFrameZod.parse({
    schemaVersion: 2,
    kind: spec.kind,
    title: spec.title,
    asOfUtc,
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind: 'stat-tile',
      values: [
        {
          id: 'v1',
          label: 'Score',
          value: 42,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
}

const fakePrepareFrame: typeof prepareGraphicFrame = (result, spec, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  return fakeFrame(spec, ctx.asOfUtc);
};

class FakeStats {
  catalogueEntries = [{ slug: 'score', catalogueId: 'CAT-SCORE' }];
  queryFreshCount = 0;
  queryImpl: () => Promise<{ result: StatResult; calculatedAsOfUtc: string }> =
    async () => ({
      result: {
        status: 'ok',
        data: { value: 42 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    });
  async catalogue() {
    return this.catalogueEntries;
  }
  async query() {
    return this.queryImpl();
  }
  async queryFresh() {
    this.queryFreshCount++;
    return this.queryImpl();
  }
}

async function showFixture(t: TestContext) {
  const { app, repository, root } = await graphicsFixture(t);
  const stats = new FakeStats();
  await app.register(graphicsPlaybackController, {
    prefix: '/graphics',
    repository,
    stats,
    prepareFrame: fakePrepareFrame,
    now: () => NOW,
    authorityEpoch: 'show-advance-authority'
  });
  return { app, repository, stats, root };
}

type App = Awaited<ReturnType<typeof showFixture>>['app'];
type Repository = Awaited<ReturnType<typeof showFixture>>['repository'];

/** Seeds `count` one-item timelines plus a producer show holding one entry per timeline, in order. */
async function seedShow(
  repository: Repository,
  eventKey: string,
  entryIds: string[]
): Promise<Rundown> {
  for (const entryId of entryIds)
    await repository.createTimeline(eventKey, {
      timelineId: `timeline-${entryId}`,
      name: `Timeline ${entryId}`,
      items: [sampleGraphic(`item-${entryId}`)]
    });
  const show = await repository.loadProducerShow(eventKey);
  return repository.updateRundown(
    eventKey,
    PRODUCER_SHOW_RUNDOWN_ID,
    {
      entries: entryIds.map((entryId) => ({
        entryId,
        timelineId: `timeline-${entryId}`
      }))
    },
    show.revision
  );
}

function advance(
  app: App,
  eventKey: string,
  body?: Record<string, unknown>
): Promise<{ statusCode: number; result: ShowAdvanceResult }> {
  return app
    .inject({
      method: 'POST',
      url: `/graphics/${eventKey}/live/show/advance`,
      payload: body ?? {}
    })
    .then((res) => ({
      statusCode: res.statusCode,
      result: res.json() as ShowAdvanceResult
    }));
}

test('advance: consumes the on-deck entry and loads it in one command', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2']);

  const { statusCode, result } = await advance(app, 'event-a', {
    requestId: 'req-1'
  });

  assert.equal(statusCode, 200);
  assert.equal(result.outcome, 'loaded');
  assert.equal(result.consumedEntryId, 'e1');
  assert.equal(result.acknowledgment.ok, true);
  // The answer carries BOTH authoritative documents, already advanced.
  assert.deepEqual(
    result.show.entries.map((e) => e.entryId),
    ['e2']
  );
  assert.equal(
    result.acknowledgment.ok && result.acknowledgment.state.loaded?.source.kind,
    'timeline'
  );
  // ...and both are what an independent read sees, so neither is a fiction.
  const stored = await repository.loadProducerShow('event-a');
  assert.deepEqual(
    stored.entries.map((e) => e.entryId),
    ['e2']
  );
  assert.equal(stored.revision, result.show.revision);
});

test('advance: replaying the request id returns the original outcome and consumes nothing more', async (t) => {
  const { app, repository, stats } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2', 'e3']);

  const first = await advance(app, 'event-a', { requestId: 'req-1' });
  const queriesAfterFirst = stats.queryFreshCount;
  const settled = await repository.loadPlayback('event-a');
  const second = await advance(app, 'event-a', { requestId: 'req-1' });

  assert.equal(first.result.consumedEntryId, 'e1');
  assert.equal(second.result.outcome, 'loaded');
  assert.equal(second.result.consumedEntryId, 'e1');
  assert.equal(
    second.result.acknowledgment.ok && second.result.acknowledgment.replayed,
    true
  );
  // The replay committed nothing: the playback revision is exactly where the
  // first call left it.
  assert.equal(
    second.result.acknowledgment.ok &&
      second.result.acknowledgment.state.revision,
    settled.revision
  );
  // And no second stats calculation was run for the replay.
  assert.equal(stats.queryFreshCount, queriesAfterFirst);
  assert.deepEqual(
    (await repository.loadProducerShow('event-a')).entries.map(
      (e) => e.entryId
    ),
    ['e2', 'e3']
  );
});

test('advance: two simultaneous advances under one request id consume exactly one entry (double click / StrictMode replay)', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2']);

  const [a, b] = await Promise.all([
    advance(app, 'event-a', { requestId: 'req-1' }),
    advance(app, 'event-a', { requestId: 'req-1' })
  ]);

  assert.equal(a.result.consumedEntryId, 'e1');
  assert.equal(b.result.consumedEntryId, 'e1');
  assert.deepEqual(
    (await repository.loadProducerShow('event-a')).entries.map(
      (e) => e.entryId
    ),
    ['e2']
  );
});

test('advance: two DIFFERENT request ids racing the same on-deck position consume one entry each and never the same one twice', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2', 'e3']);

  const [a, b] = await Promise.all([
    advance(app, 'event-a', { requestId: 'req-1' }),
    advance(app, 'event-a', { requestId: 'req-2' })
  ]);

  const consumed = [a.result.consumedEntryId, b.result.consumedEntryId].filter(
    (id): id is string => id !== null
  );
  // Whatever interleaving happened, no entry was consumed twice and the show
  // reflects exactly what was taken out of it.
  assert.equal(new Set(consumed).size, consumed.length);
  const remaining = (await repository.loadProducerShow('event-a')).entries.map(
    (e) => e.entryId
  );
  assert.deepEqual(
    [...consumed, ...remaining].sort(),
    ['e1', 'e2', 'e3'].slice(0, consumed.length + remaining.length).sort()
  );
  assert.equal(consumed.length + remaining.length, 3);
});

test('advance: a stale expectedShowRevision is refused, and consumes nothing', async (t) => {
  const { app, repository } = await showFixture(t);
  const seeded = await seedShow(repository, 'event-a', ['e1', 'e2']);

  const { statusCode, result } = await advance(app, 'event-a', {
    requestId: 'req-1',
    expectedShowRevision: seeded.revision - 1
  });

  // 200 with a rejection inside: the caller must keep the `show` it is handed
  // in order to recover, which a throwing status would have discarded.
  assert.equal(statusCode, 200);
  assert.equal(result.outcome, 'rejected');
  assert.equal(result.consumedEntryId, null);
  assert.equal(result.acknowledgment.ok, false);
  assert.equal(
    !result.acknowledgment.ok && result.acknowledgment.error.code,
    'CONFLICT'
  );
  assert.deepEqual(
    result.show.entries.map((e) => e.entryId),
    ['e1', 'e2']
  );
});

test('advance: a reorder committed between the read and the consume loses the race rather than consuming the wrong entry', async (t) => {
  const { app, repository } = await showFixture(t);
  const seeded = await seedShow(repository, 'event-a', ['e1', 'e2']);
  // The operator reorders: e2 is now on deck. An advance still holding the
  // previous revision must not consume e1 "because it was position 1".
  await repository.updateRundown(
    'event-a',
    PRODUCER_SHOW_RUNDOWN_ID,
    {
      entries: [
        { entryId: 'e2', timelineId: 'timeline-e2' },
        { entryId: 'e1', timelineId: 'timeline-e1' }
      ]
    },
    seeded.revision
  );

  const stale = await advance(app, 'event-a', {
    requestId: 'req-1',
    expectedShowRevision: seeded.revision
  });
  assert.equal(stale.result.outcome, 'rejected');

  // Retried against what the server actually holds, it consumes the entry the
  // operator can now see on deck.
  const fresh = await advance(app, 'event-a', { requestId: 'req-2' });
  assert.equal(fresh.result.consumedEntryId, 'e2');
});

test('advance: a load that fails consumes nothing - the entry is never both loaded and still queued', async (t) => {
  const { app, repository } = await showFixture(t);
  const show = await repository.loadProducerShow('event-a');
  // An entry pointing at a timeline that does not exist: `load` rejects, and
  // the whole operation must roll back with it.
  await repository.updateRundown(
    'event-a',
    PRODUCER_SHOW_RUNDOWN_ID,
    { entries: [{ entryId: 'e1', timelineId: 'missing-timeline' }] },
    show.revision
  );

  const { result } = await advance(app, 'event-a', { requestId: 'req-1' });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.consumedEntryId, null);
  assert.equal(result.acknowledgment.ok, false);
  assert.deepEqual(
    result.show.entries.map((e) => e.entryId),
    ['e1']
  );
  assert.deepEqual(
    (await repository.loadProducerShow('event-a')).entries.map(
      (e) => e.entryId
    ),
    ['e1']
  );
});

test('advance: a rundown write that fails rolls the playback write back with it', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1']);
  const before = await repository.loadPlayback('event-a');

  // Inject a failure on the rundown side of the shared transaction by making
  // the row unreadable. Nothing may commit: not the removal, not the load.
  await repository.deleteRundown(
    'event-a',
    PRODUCER_SHOW_RUNDOWN_ID,
    (await repository.loadProducerShow('event-a')).revision
  );
  // Re-created empty by the read at the top of `advanceShow`, so name the
  // entry explicitly - the consume then targets an entry the write cannot
  // find in the (now empty) document.
  const { result } = await advance(app, 'event-a', {
    requestId: 'req-1',
    entryId: 'e1'
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.consumedEntryId, null);
  const after = await repository.loadPlayback('event-a');
  assert.equal(after.revision, before.revision);
  assert.equal(after.loaded, null);
});

test('advance: take puts the consumed entry on air in the same action', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2']);

  const { result } = await advance(app, 'event-a', {
    requestId: 'req-1',
    entryId: 'e2',
    take: true
  });

  assert.equal(result.outcome, 'loaded-and-taken');
  assert.equal(result.consumedEntryId, 'e2');
  assert.ok(result.acknowledgment.ok && result.acknowledgment.state.program);
  // Quick Play names its entry, so a concurrent change to OTHER entries does
  // not affect which one it played: e1 is untouched and still on deck.
  assert.deepEqual(
    result.show.entries.map((e) => e.entryId),
    ['e1']
  );
});

test('advance: clearFirst with an empty show clears and unloads, and reports it as empty rather than as a failure', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1']);
  await advance(app, 'event-a', { requestId: 'req-1', take: true });

  const { statusCode, result } = await advance(app, 'event-a', {
    requestId: 'req-2',
    clearFirst: true
  });

  assert.equal(statusCode, 200);
  assert.equal(result.outcome, 'empty');
  assert.equal(result.consumedEntryId, null);
  assert.equal(result.acknowledgment.ok, true);
  const state = await repository.loadPlayback('event-a');
  assert.equal(state.program, null);
  assert.equal(state.loaded, null);
});

test('advance: naming an entry someone else already consumed is reported, never silently retargeted', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1', 'e2']);
  await advance(app, 'event-a', { requestId: 'req-1', entryId: 'e1' });

  const { result } = await advance(app, 'event-a', {
    requestId: 'req-2',
    entryId: 'e1'
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(
    !result.acknowledgment.ok && result.acknowledgment.error.code,
    'NOT_FOUND'
  );
  // e2 is still there: the second press did not fall through onto it.
  assert.deepEqual(
    result.show.entries.map((e) => e.entryId),
    ['e2']
  );
});

test('advance: one event cannot consume another event\'s show', async (t) => {
  const { app, repository } = await showFixture(t);
  await seedShow(repository, 'event-a', ['e1']);
  await seedShow(repository, 'event-b', ['e1']);

  await advance(app, 'event-a', { requestId: 'req-1' });

  assert.deepEqual(
    (await repository.loadProducerShow('event-a')).entries.map(
      (e) => e.entryId
    ),
    []
  );
  assert.deepEqual(
    (await repository.loadProducerShow('event-b')).entries.map(
      (e) => e.entryId
    ),
    ['e1']
  );
});
