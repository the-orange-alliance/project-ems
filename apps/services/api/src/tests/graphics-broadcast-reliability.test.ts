import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGraphicsBroadcastReliabilityHarness,
  sampleGraphic,
  seedRundown,
  seedTimeline
} from './graphics-broadcast-reliability-harness.js';
// @ts-expect-error realtime does not emit declarations; the harness exercises its compiled boundary.
import { PlaybackPublicationReceiver } from '../../../realtime/build/PlaybackPublication.js';

function publicationAudience() {
  const states: any[] = [];
  const server = {
    in(room: string) {
      return {
        emit(_event: string, payload: unknown) {
          states.push({ room, payload });
        }
      };
    }
  };
  const receiver = new PlaybackPublicationReceiver(server as any);
  return {
    states,
    publish: (eventKey: string, state: unknown) =>
      receiver.accept({
        schemaVersion: 1,
        authorityEpoch: 'api-test-epoch',
        eventKey,
        state
      })
  };
}

test('direct API quick-take publication reaches the subscribed event audience', async (t) => {
  const audience = publicationAudience();
  const { app, coordinator } = await createGraphicsBroadcastReliabilityHarness(
    t,
    {
      publish: audience.publish
    }
  );
  const requested = sampleGraphic('direct-quick-stat');

  const response = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: requested }
  });
  assert.equal(response.statusCode, 200);
  const acknowledgment = response.json();
  await coordinator.retryPublication('event-a');

  const delivered = audience.states.filter(
    (entry) => entry.payload.generation === acknowledgment.state.revision
  );
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].room, 'graphics:event-a');
  assert.equal(delivered[0].payload.spec.id, requested.id);
  assert.equal(delivered[0].payload.onAir, true);

  const health = await app.inject('/graphics/event-a/live/publication-health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().pendingRevision, null);
  assert.equal(
    health.json().lastDeliveredRevision,
    acknowledgment.state.revision
  );
});

test('relay-mediated command converges on API publication without a duplicate final broadcast', async (t) => {
  const audience = publicationAudience();
  const { realtime, coordinator } =
    await createGraphicsBroadcastReliabilityHarness(t, {
      publish: audience.publish
    });
  const requested = sampleGraphic('relayed-quick-stat');

  const returned = await realtime.quickTake('event-a', requested, true);
  assert.ok(returned);
  await coordinator.retryPublication('event-a');

  const finalRevision = returned.generation;
  assert.equal(
    audience.states.filter(
      (entry) => entry.payload.generation === finalRevision
    ).length,
    1
  );
  assert.equal(audience.states.at(-1).payload.spec.id, requested.id);
});

test('each playback mutation type publishes the exact committed acknowledgment revision', async (t) => {
  const audience = publicationAudience();
  const { app, repository, coordinator } =
    await createGraphicsBroadcastReliabilityHarness(t, {
      publish: audience.publish
    });
  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-a', 'item-b']);
  await seedRundown(repository, 'event-a', 'rundown-a', [
    { timelineId: 'timeline-a' }
  ]);

  async function committed(
    label: string,
    method: 'GET' | 'POST',
    url: string,
    payload?: unknown
  ) {
    const response = await app.inject({ method, url, payload: payload as any });
    assert.equal(response.statusCode, 200, `${label}: ${response.payload}`);
    const acknowledgment = response.json();
    assert.equal(acknowledgment.ok, true, label);
    await coordinator.retryPublication('event-a');
    assert.equal(
      audience.states.filter(
        (entry) =>
          entry.room === 'graphics:event-a' &&
          entry.payload.generation === acknowledgment.state.revision
      ).length,
      1,
      `${label} did not publish its exact committed revision once`
    );
  }

  await committed('load', 'POST', '/graphics/event-a/live/load/timeline-a', {
    requestId: 'publish-load'
  });
  await committed('advance', 'GET', '/graphics/event-a/live/advance');
  await committed('previous', 'GET', '/graphics/event-a/live/previous');
  await committed('go', 'GET', '/graphics/event-a/live/go/1');
  await committed('take', 'GET', '/graphics/event-a/live/take');
  await committed('refresh', 'GET', '/graphics/event-a/live/refresh/program');
  await committed('push-update', 'GET', '/graphics/event-a/live/push-update');
  await committed('clear', 'GET', '/graphics/event-a/live/clear');
  await committed('cue', 'POST', '/graphics/event-a/live/cue', {
    requestId: 'publish-cue',
    spec: sampleGraphic('ad-hoc-cue')
  });
  await committed('quick-take', 'POST', '/graphics/event-a/live/quick-take', {
    requestId: 'publish-quick-take',
    spec: sampleGraphic('ad-hoc-live')
  });
  await committed('unload', 'GET', '/graphics/event-a/live/unload');
  await committed(
    'load-rundown',
    'GET',
    '/graphics/event-a/live/load-rundown/rundown-a'
  );
});

test('isolated harness: event-scoped playback stays independent and persisted clear survives relay reads', async (t) => {
  const { app, realtime, repository } =
    await createGraphicsBroadcastReliabilityHarness(t);

  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-0']);
  await seedTimeline(repository, 'event-b', 'timeline-b', ['item-1']);

  const loadA = await realtime.load('event-a', 'timeline-a');
  assert.ok(loadA);
  assert.equal(loadA.timelineId, 'timeline-a');
  assert.equal(loadA.onAir, false);

  const stateB = await realtime.getState('event-b');
  assert.ok(stateB);
  assert.equal(stateB.timelineId, null);
  assert.equal(stateB.generation, 0);

  const takenA = await realtime.take('event-a');
  assert.ok(takenA);
  assert.equal(takenA.onAir, true);
  assert.equal(takenA.spec?.id, 'item-0');

  const clearedA = await realtime.clear('event-a');
  assert.ok(clearedA);
  assert.equal(clearedA.onAir, false);
  // generation mirrors state.revision (rooms/Graphics.ts: `generation: state.revision`). load's prepared
  // cue consumes 2 durable commits (calculating checkpoint, then ready), take and clear consume 1 each: 4 total.
  assert.equal(clearedA.generation, 4);

  const persisted = await app.inject({
    method: 'GET',
    url: '/graphics/event-a/live'
  });
  assert.equal(persisted.statusCode, 200);
  const persistedState = persisted.json();
  assert.equal(persistedState.program, null);
  assert.equal(persistedState.cue.status, 'ready');
});

test('isolated harness: load-rundown advances across entry boundaries without leaking state across events', async (t) => {
  const { app, realtime, repository } =
    await createGraphicsBroadcastReliabilityHarness(t);

  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-a']);
  await seedTimeline(repository, 'event-a', 'timeline-b', ['item-b']);
  await seedRundown(repository, 'event-a', 'r1', [
    { timelineId: 'timeline-a' },
    { timelineId: 'timeline-b' }
  ]);

  const loadRundown = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/load-rundown/r1'
  });
  assert.equal(loadRundown.statusCode, 200);
  // POST load-rundown returns a PlaybackAcknowledgment (ok/requestId/state), not the raw PlaybackState.
  const loaded = loadRundown.json().state;
  assert.equal(loaded.loaded.source.kind, 'rundown');
  assert.equal(loaded.loaded.items.length, 2);
  assert.equal(loaded.cue.status, 'ready');

  const advanced = await realtime.advance('event-a');
  assert.ok(advanced);
  assert.equal(advanced.timelineId, 'timeline-b');
  // Nothing has been taken, so `spec`/`frame` are correctly null: they track
  // `program` and NOTHING else, staying in lockstep with `onAir` (see
  // `toLegacyState`'s own doc comment - preferring a ready cue here is the
  // exact behavior that was deliberately removed). What this test is really
  // checking - that advance crossed the rundown entry boundary onto
  // timeline-b's item - is now expressed by `previewSpec`, the item that a
  // take would put up next.
  assert.equal(advanced.spec, null);
  assert.equal(advanced.onAir, false);
  assert.equal(advanced.previewSpec?.id, 'item-b');

  const live = await app.inject({
    method: 'GET',
    url: '/graphics/event-a/live'
  });
  assert.equal(live.statusCode, 200);
  const liveState = live.json();
  assert.equal(liveState.loaded.index, 1);
  assert.equal(liveState.loaded.source.kind, 'rundown');
});

test('isolated harness: ready-only Take rejects before a cue exists, and quick-take failures retain the last program', async (t) => {
  const { app, stats, repository } =
    await createGraphicsBroadcastReliabilityHarness(t);

  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-0', 'item-1']);

  const missingCueTake = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/take'
  });
  assert.equal(missingCueTake.statusCode, 409);
  assert.equal(missingCueTake.json().error.code, 'NOT_READY');

  const loadTimeline = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/load/timeline-a'
  });
  assert.equal(loadTimeline.statusCode, 200);

  const takeRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/take'
  });
  assert.equal(takeRes.statusCode, 200);
  // POST take also returns a PlaybackAcknowledgment, not the raw PlaybackState.
  const takenState = takeRes.json().state;
  assert.equal(takenState.program.graphic.spec.id, 'item-0');

  stats.queryImpl = async () => ({
    result: {
      status: 'unavailable',
      reason: 'fixture failure',
      warnings: []
    },
    calculatedAsOfUtc: '2026-01-01T00:00:00.000Z'
  });

  const quickTakeRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: sampleGraphic('item-1') }
  });

  assert.equal(quickTakeRes.statusCode, 422);
  const quickTakeAck = quickTakeRes.json();
  assert.equal(quickTakeAck.error.code, 'CALCULATION_FAILED');

  const afterFailure = await app.inject({
    method: 'GET',
    url: '/graphics/event-a/live'
  });
  assert.equal(afterFailure.statusCode, 200);
  const afterFailureState = afterFailure.json();
  assert.equal(afterFailureState.program.graphic.spec.id, 'item-0');
  assert.equal(afterFailureState.cue.status, 'failed');
});

test('isolated harness: relay quick-take airs the exact requested ad-hoc graphic', async (t) => {
  const { realtime, stats } =
    await createGraphicsBroadcastReliabilityHarness(t);

  const requested = sampleGraphic('quick-stat');
  const state = await realtime.quickTake('event-a', requested, true);

  assert.ok(state);
  assert.equal(state.onAir, true);
  assert.equal(state.spec?.id, requested.id);
  assert.equal(stats.queryCount, 0);
  assert.equal(stats.queryFreshCount, 1);
});

// Producer cue goes to the port-8080 API ingress, never the port-8081 relay:
// the relay has no `cue` proxy and must not grow one (Task 03's boundary,
// Task 16 removes the proxies it still has).
test('isolated harness: authoritative cue resolves values and readies the exact spec without changing program', async (t) => {
  const { app, stats } = await createGraphicsBroadcastReliabilityHarness(t);
  const requested = {
    ...sampleGraphic('bound-cue'),
    selectors: { teamKey: 999 },
    bindings: { teamKey: 'featured' }
  };

  const cueRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/cue',
    payload: {
      requestId: 'producer-cue-1',
      spec: requested,
      values: { featured: 254 }
    }
  });

  assert.equal(cueRes.statusCode, 200);
  const acknowledgment = cueRes.json();
  assert.equal(acknowledgment.ok, true);
  assert.equal(acknowledgment.requestId, 'producer-cue-1');
  assert.equal(acknowledgment.state.program, null);

  const read = await app.inject('/graphics/event-a/live');
  assert.equal(read.statusCode, 200);
  const state = read.json();
  assert.equal(state.program, null);
  assert.equal(state.cue.status, 'ready');
  assert.equal(state.cue.graphic.spec.id, requested.id);
  assert.equal(state.cue.graphic.spec.selectors.teamKey, 254);
  assert.equal(state.cue.graphic.spec.bindings, undefined);
  assert.equal(state.cue.graphic.target.requestId, 'producer-cue-1');
  assert.equal(stats.queryCount, 0);
  assert.equal(stats.queryFreshCount, 1);
});

test('isolated harness: unresolved authoritative cue binding is visible and does not mutate cue or program', async (t) => {
  const { app } = await createGraphicsBroadcastReliabilityHarness(t);
  const requested = {
    ...sampleGraphic('unresolved-cue'),
    bindings: { teamKey: 'featured' }
  };

  const response = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/cue',
    payload: {
      requestId: 'producer-cue-missing',
      spec: requested,
      values: {}
    }
  });

  assert.equal(response.statusCode, 400);
  const acknowledgment = response.json();
  assert.equal(acknowledgment.ok, false);
  assert.equal(acknowledgment.error.code, 'INVALID_INPUT');
  assert.match(acknowledgment.error.message, /Fill in: featured/);
  assert.equal(acknowledgment.state.cue.status, 'empty');
  assert.equal(acknowledgment.state.program, null);
});

test('isolated harness: refresh stages a new program and explicit push-update promotes it', async (t) => {
  const { app, repository } =
    await createGraphicsBroadcastReliabilityHarness(t);

  await seedTimeline(repository, 'event-a', 'timeline-a', ['item-0']);

  const loadTimeline = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/load/timeline-a'
  });
  assert.equal(loadTimeline.statusCode, 200);

  const takeRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/take'
  });
  assert.equal(takeRes.statusCode, 200);
  const programBeforeRefresh = takeRes.json().state.program;

  const refreshRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/refresh/program'
  });
  assert.equal(refreshRes.statusCode, 200);
  const refreshAck = refreshRes.json();
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');
  assert.deepEqual(refreshAck.state.program, programBeforeRefresh);

  const pushRes = await app.inject({
    method: 'GET',
    url: '/graphics/event-a/live/push-update'
  });
  assert.equal(pushRes.statusCode, 200);
  const pushAck = pushRes.json();
  assert.equal(pushAck.state.stagedUpdate.status, 'empty');
  assert.equal(pushAck.state.program.graphic.spec.id, 'item-0');
  assert.notEqual(
    pushAck.state.program.graphic.target.targetId,
    programBeforeRefresh.graphic.target.targetId
  );
});
