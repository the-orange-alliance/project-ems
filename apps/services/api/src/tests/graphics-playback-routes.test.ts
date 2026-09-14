import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import {
  presentationFrameZod,
  type GraphicSpec,
  type GraphicsTarget,
  type PlaybackAcknowledgment,
  type PlaybackState
} from '@toa-lib/models/base';
import type {
  prepareGraphicFrame,
  StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import graphicsPlaybackController from '../controllers/GraphicsPlayback.js';
import { graphicsFixture, sampleGraphic } from './graphics-test-support.js';

/**
 * Route-level integration tests for the HTTP playback command surface
 * (`GraphicsPlayback.ts`). Every test drives a real Fastify instance through
 * `app.inject()` only - the same mechanism `app.listen()` would eventually
 * expose over a real socket, but with no port bound and no HTTP client
 * anywhere. That is the point: these prove a Bitfocus Companion button (a
 * single fire-and-forget HTTP request, often GET, never with a browser or a
 * producer socket open) can drive the whole broadcast on its own.
 *
 * `PlaybackNavigation`/`PlaybackProgram`/`PlaybackRefresh` are driven with
 * their real production collaborators EXCEPT `stats`/`prepareFrame`, which
 * are deterministic in-memory fakes (mirroring `playback-navigation.test.ts`
 * et al.) so these tests never spin up a real `StatsWorkerPool` or touch a
 * season's real calculators. `GraphicsRepository` (timelines, rundowns, and
 * the coordinator's own durable storage) is the real SQLite-backed one used
 * in production, via `graphicsFixture`.
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
  catalogueEntries: { slug: string; catalogueId: string }[] = [
    { slug: 'score', catalogueId: 'CAT-SCORE' }
  ];
  queryCount = 0;
  queryFreshCount = 0;
  queryImpl: (
    eventKey: string,
    input: unknown
  ) => Promise<{ result: StatResult; calculatedAsOfUtc: string }> =
    async () => ({
      result: {
        status: 'ok',
        data: { value: 42 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    });
  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return this.catalogueEntries;
  }
  async query(eventKey: string, input: unknown) {
    this.queryCount++;
    return this.queryImpl(eventKey, input);
  }
  async queryFresh(eventKey: string, input: unknown) {
    this.queryFreshCount++;
    return this.queryImpl(eventKey, input);
  }
}

/** Builds the full app: the real CRUD controller plus the playback controller under test, sharing one repository/coordinator - exactly the production `/graphics` prefix wiring in Server.ts. */
async function playbackFixture(
  t: TestContext,
  statsOverrides: Partial<
    Pick<FakeStats, 'queryImpl' | 'catalogueEntries'>
  > = {}
) {
  const { app, repository, root } = await graphicsFixture(t);
  const stats = new FakeStats();
  Object.assign(stats, statsOverrides);
  await app.register(graphicsPlaybackController, {
    prefix: '/graphics',
    repository,
    stats,
    prepareFrame: fakePrepareFrame,
    now: () => NOW
  });
  return { app, repository, stats, root };
}

type Repository = Awaited<ReturnType<typeof graphicsFixture>>['repository'];

function seedTimeline(
  repository: Repository,
  eventKey: string,
  timelineId: string,
  itemIds: string[]
) {
  return repository.createTimeline(eventKey, {
    timelineId,
    name: `Timeline ${timelineId}`,
    items: itemIds.map((id) => sampleGraphic(id))
  });
}

function stateOf(res: { json(): unknown }): PlaybackState {
  return res.json() as PlaybackState;
}
function ackOf(res: { json(): unknown }): PlaybackAcknowledgment {
  return res.json() as PlaybackAcknowledgment;
}

test('headless show: drives a complete broadcast over plain HTTP with no browser and no socket client connected', async (t) => {
  const { app, repository, stats } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0', 'item-1']);

  // Load, over HTTP only.
  const loadRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });
  if (loadRes.statusCode !== 200) console.log('DEBUG load body:', loadRes.body);
  assert.equal(loadRes.statusCode, 200);
  const loaded = ackOf(loadRes);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.state.cue.status, 'ready');
  if (loaded.state.cue.status !== 'ready') return;
  assert.equal(loaded.state.loaded?.index, 0);

  // GET /live shows the same ready cue, independently.
  const afterLoad = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live`
  });
  assert.equal(afterLoad.statusCode, 200);
  const stateAfterLoad = stateOf(afterLoad);
  assert.equal(stateAfterLoad.cue.status, 'ready');
  assert.equal(stateAfterLoad.revision, loaded.state.revision);

  // Take: program comes on air.
  const takeRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/take`
  });
  assert.equal(takeRes.statusCode, 200);
  const taken = ackOf(takeRes);
  assert.equal(taken.ok, true);
  if (!taken.ok) return;
  assert.ok(taken.state.program);
  const firstProgramTarget = taken.state.program!.graphic.target;
  assert.equal(firstProgramTarget.index, 0);
  // Response body is durable state, not a bare envelope: the real prepared frame is present.
  assert.deepEqual(
    taken.state.program!.graphic.frame,
    fakeFrame(sampleGraphic('item-0'), NOW)
  );
  // Durable state: a subsequent, independent GET proves the same revision was actually persisted.
  const afterTake = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live`
  });
  assert.equal(stateOf(afterTake).revision, taken.state.revision);

  // Advance: cue moves, program is untouched.
  const advanceRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/advance`
  });
  assert.equal(advanceRes.statusCode, 200);
  const advanced = ackOf(advanceRes);
  assert.equal(advanced.ok, true);
  if (!advanced.ok) return;
  assert.equal(advanced.state.loaded?.index, 1);
  assert.deepEqual(advanced.state.program!.graphic.target, firstProgramTarget);

  // Take again: program becomes the new cue.
  const takeAgainRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/take`
  });
  assert.equal(takeAgainRes.statusCode, 200);
  const takenAgain = ackOf(takeAgainRes);
  assert.equal(takenAgain.ok, true);
  if (!takenAgain.ok) return;
  assert.equal(takenAgain.state.program!.graphic.target.index, 1);
  assert.notDeepEqual(
    takenAgain.state.program!.graphic.target,
    firstProgramTarget
  );

  // Clear: program goes to black, cue is preserved.
  const clearRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/clear`
  });
  assert.equal(clearRes.statusCode, 200);
  const cleared = ackOf(clearRes);
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  assert.equal(cleared.state.program, null);
  assert.equal(cleared.state.cue.status, 'ready');
  assert.equal(stats.queryCount, 0, 'authoritative cue never accepts SWR data');
  assert.equal(stats.queryFreshCount, 2, 'load and advance each await fresh data');
});

test('every body-less command works over GET with no payload (the Companion path)', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0', 'item-1']);

  const load = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });
  assert.equal(load.statusCode, 200);

  const take = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/take`
  });
  assert.equal(take.statusCode, 200);
  const taken = ackOf(take);
  assert.equal(taken.ok, true);
  if (!taken.ok) return;
  assert.equal(taken.state.program?.graphic.target.index, 0);

  const advance = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/advance`
  });
  assert.equal(advance.statusCode, 200);
  assert.equal(
    ackOf(advance).ok &&
      (ackOf(advance) as { state: PlaybackState }).state.loaded?.index,
    1
  );

  const previous = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/previous`
  });
  assert.equal(previous.statusCode, 200);
  const prevAck = ackOf(previous);
  assert.equal(prevAck.ok, true);
  if (!prevAck.ok) return;
  assert.equal(prevAck.state.loaded?.index, 0);

  // Stage and push an update body-less: refresh (POST, needs an explicit destination) then a GET push-update
  // with no target - resolved server-side from state.stagedUpdate.origin.
  const refresh = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/refresh/program`
  });
  assert.equal(refresh.statusCode, 200);
  const refreshed = ackOf(refresh);
  assert.equal(refreshed.ok, true);
  if (!refreshed.ok) return;
  assert.equal(refreshed.state.stagedUpdate.status, 'ready');

  const pushUpdate = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/push-update`
  });
  assert.equal(pushUpdate.statusCode, 200);
  const pushed = ackOf(pushUpdate);
  assert.equal(pushed.ok, true);
  if (!pushed.ok) return;
  assert.equal(pushed.state.stagedUpdate.status, 'empty');

  const clear = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/clear`
  });
  assert.equal(clear.statusCode, 200);
  const clearedAck = ackOf(clear);
  assert.equal(clearedAck.ok, true);
  if (!clearedAck.ok) return;
  assert.equal(clearedAck.state.program, null);
});

test('eventKey is honored: two events on the same app instance are completely independent', async (t) => {
  const { app, repository } = await playbackFixture(t);
  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-0']);
  await seedTimeline(repository, 'event-b', 'timeline-b', ['item-0']);

  await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/load/timeline-a'
  });
  const takeA = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/take'
  });
  assert.equal(takeA.statusCode, 200);
  assert.equal(
    (ackOf(takeA) as { ok: true; state: PlaybackState }).state.program?.graphic
      .spec.id,
    'item-0'
  );

  // event-b was never touched: it must still be the empty default state, not a copy of event-a's.
  const stateB = stateOf(
    await app.inject({ method: 'GET', url: '/graphics/event-b/live' })
  );
  assert.equal(stateB.program, null);
  assert.equal(stateB.cue.status, 'empty');
  assert.equal(stateB.revision, 0);

  // Driving event-b afterward does not disturb event-a.
  await app.inject({
    method: 'POST',
    url: '/graphics/event-b/live/load/timeline-b'
  });
  const takeB = await app.inject({
    method: 'POST',
    url: '/graphics/event-b/live/take'
  });
  assert.equal(takeB.statusCode, 200);

  const stateAAfter = stateOf(
    await app.inject({ method: 'GET', url: '/graphics/event-a/live' })
  );
  assert.equal(stateAAfter.program?.graphic.spec.id, 'item-0');
  assert.equal(stateAAfter.eventKey, 'event-a');
  const stateBAfter = stateOf(
    await app.inject({ method: 'GET', url: '/graphics/event-b/live' })
  );
  assert.equal(stateBAfter.eventKey, 'event-b');
  assert.notEqual(
    stateAAfter.program?.graphic.target.targetId,
    stateBAfter.program?.graphic.target.targetId
  );
});

test('go is zero-based: index 0 is the first item, index 1 is the second', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', [
    'item-0',
    'item-1',
    'item-2'
  ]);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  const goZero = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/go/0`
  });
  assert.equal(goZero.statusCode, 200);
  const zeroAck = ackOf(goZero);
  assert.equal(zeroAck.ok, true);
  if (!zeroAck.ok) return;
  assert.equal(zeroAck.state.loaded?.index, 0);
  assert.equal(
    zeroAck.state.cue.status === 'ready' && zeroAck.state.cue.graphic.spec.id,
    'item-0'
  );

  const goOne = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/go/1`
  });
  assert.equal(goOne.statusCode, 200);
  const oneAck = ackOf(goOne);
  assert.equal(oneAck.ok, true);
  if (!oneAck.ok) return;
  assert.equal(oneAck.state.loaded?.index, 1);
  assert.equal(
    oneAck.state.cue.status === 'ready' && oneAck.state.cue.graphic.spec.id,
    'item-1'
  );

  // The querystring alternative for a caller that cannot build a path segment.
  const goQuery = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/go?index=0`
  });
  assert.equal(goQuery.statusCode, 200);
  const queryAck = ackOf(goQuery);
  assert.equal(queryAck.ok, true);
  if (!queryAck.ok) return;
  assert.equal(queryAck.state.loaded?.index, 0);
});

test('invalid input is rejected with 400', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0', 'item-1']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  const nonNumeric = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/go/abc`
  });
  assert.equal(nonNumeric.statusCode, 400);

  const negative = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/go/-1`
  });
  assert.equal(negative.statusCode, 400);

  // In-range for the schema (a non-negative integer) but out of range for the loaded snapshot: a business
  // rejection (INVALID_INPUT), not a schema violation - and still a 400.
  const outOfRange = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/go/99`
  });
  assert.equal(outOfRange.statusCode, 400);
  const outOfRangeAck = ackOf(outOfRange);
  assert.equal(outOfRangeAck.ok, false);
  if (outOfRangeAck.ok) return;
  assert.equal(outOfRangeAck.error.code, 'INVALID_INPUT');

  const badDestination = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/refresh/bogus`
  });
  assert.equal(badDestination.statusCode, 400);

  const malformedQuickTake = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-take`,
    payload: { spec: { id: 'x' } }
  });
  assert.equal(malformedQuickTake.statusCode, 400);
});

test('an unknown timeline id is rejected with 404', async (t) => {
  const { app } = await playbackFixture(t);
  const eventKey = 'event-a';
  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/does-not-exist`
  });
  assert.equal(res.statusCode, 404);
  const ack = ackOf(res);
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_FOUND');
});

test('take with a stale explicit target is rejected 409 SUPERSEDED and the previous program stays on air', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0', 'item-1']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  const takeRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/take`
  });
  const taken = ackOf(takeRes) as { ok: true; state: PlaybackState };
  const staleTarget: GraphicsTarget = taken.state.program!.graphic.target;

  // Move the cue on: the ready cue's target is no longer staleTarget.
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/advance`
  });

  const staleTake = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/take`,
    payload: { target: staleTarget }
  });
  assert.equal(staleTake.statusCode, 409);
  const staleAck = ackOf(staleTake);
  assert.equal(staleAck.ok, false);
  if (staleAck.ok) return;
  assert.equal(staleAck.error.code, 'SUPERSEDED');

  const after = stateOf(
    await app.inject({ method: 'GET', url: `/graphics/${eventKey}/live` })
  );
  assert.deepEqual(after.program?.graphic.target, staleTarget);
  assert.equal(after.program?.graphic.spec.id, 'item-0');
});

test('an expectedRevision mismatch is rejected 409 CONFLICT', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0']);
  const loaded = ackOf(
    await app.inject({
      method: 'POST',
      url: `/graphics/${eventKey}/live/load/timeline-1`
    })
  ) as { ok: true; state: PlaybackState };

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/advance`,
    payload: { expectedRevision: loaded.state.revision + 5 }
  });
  assert.equal(res.statusCode, 409);
  const ack = ackOf(res);
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'CONFLICT');
});

test('replaying the same requestId returns the original acknowledgment instead of acting twice', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0', 'item-1']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  const first = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/advance`,
    payload: { requestId: 'req-fixed-1' }
  });
  assert.equal(first.statusCode, 200);
  const firstAck = ackOf(first) as {
    ok: true;
    replayed: boolean;
    state: PlaybackState;
  };
  assert.equal(firstAck.replayed, false);
  assert.equal(firstAck.state.loaded?.index, 1);

  const replay = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/advance`,
    payload: { requestId: 'req-fixed-1' }
  });
  assert.equal(replay.statusCode, 200);
  const replayAck = ackOf(replay) as {
    ok: true;
    replayed: boolean;
    state: PlaybackState;
  };
  assert.equal(replayAck.replayed, true);
  // The revision must not have advanced a second time.
  assert.equal(replayAck.state.revision, firstAck.state.revision);
  assert.equal(replayAck.state.loaded?.index, 1);
});

test('two consecutive body-less advances use distinct auto-generated requestIds and both actually advance', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', [
    'item-0',
    'item-1',
    'item-2'
  ]);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  const first = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/advance`
  });
  const firstAck = ackOf(first) as {
    ok: true;
    requestId: string;
    state: PlaybackState;
  };
  assert.equal(firstAck.state.loaded?.index, 1);

  const second = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/advance`
  });
  const secondAck = ackOf(second) as {
    ok: true;
    requestId: string;
    state: PlaybackState;
  };
  // If the server reused a constant/derived requestId, this would be treated as a replay of the first
  // advance and the show would freeze on item 1 instead of reaching item 2.
  assert.notEqual(secondAck.requestId, firstAck.requestId);
  assert.equal(secondAck.state.loaded?.index, 2);
  // Two durable commits per prepared cue: the 'calculating' checkpoint (for restart-recovery) in beginPreparation,
  // then the final 'ready' commit in completePreparation. Each commit increments the revision, so advance consumes 2.
  assert.equal(secondAck.state.revision, firstAck.state.revision + 2);
});

test('status mapping: 400/404/409/422 are all reachable and carry the acknowledgment body', async (t) => {
  const { app, repository } = await playbackFixture(t, {
    catalogueEntries: [{ slug: 'score', catalogueId: 'CAT-SCORE' }]
  });
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-1', ['item-0']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-1`
  });

  // 400: INVALID_INPUT (go out of range).
  const r400 = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/go/50`
  });
  assert.equal(r400.statusCode, 400);
  assert.equal(
    (ackOf(r400) as { ok: false; error: { code: string } }).error.code,
    'INVALID_INPUT'
  );

  // 404: NOT_FOUND (unknown timeline).
  const r404 = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/nope`
  });
  assert.equal(r404.statusCode, 404);
  assert.equal(
    (ackOf(r404) as { ok: false; error: { code: string } }).error.code,
    'NOT_FOUND'
  );

  // 409: NOT_READY (take with nothing cued yet, on a fresh event with no load at all).
  const otherEvent = 'event-b';
  const r409 = await app.inject({
    method: 'POST',
    url: `/graphics/${otherEvent}/live/take`
  });
  assert.equal(r409.statusCode, 409);
  assert.equal(
    (ackOf(r409) as { ok: false; error: { code: string } }).error.code,
    'NOT_READY'
  );

  // 422: CALCULATION_FAILED (quick-take for a stat the catalogue does not recognize).
  const r422 = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-take`,
    payload: { spec: { ...sampleGraphic('unknown'), stat: 'not-a-real-stat' } }
  });
  assert.equal(r422.statusCode, 422);
  const ack422 = ackOf(r422);
  assert.equal(ack422.ok, false);
  if (ack422.ok) return;
  assert.equal(ack422.error.code, 'CALCULATION_FAILED');
});
