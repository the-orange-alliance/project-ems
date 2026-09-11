import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGraphicsBroadcastReliabilityHarness,
  sampleGraphic,
  seedRundown,
  seedTimeline
} from './graphics-broadcast-reliability-harness.js';

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

  const refreshRes = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/refresh/program'
  });
  assert.equal(refreshRes.statusCode, 200);
  const refreshAck = refreshRes.json();
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');
  assert.equal(refreshAck.state.program.graphic.spec.id, 'item-0');

  const pushRes = await app.inject({
    method: 'GET',
    url: '/graphics/event-a/live/push-update'
  });
  assert.equal(pushRes.statusCode, 200);
  const pushAck = pushRes.json();
  assert.equal(pushAck.state.stagedUpdate.status, 'empty');
  assert.equal(pushAck.state.program.graphic.spec.id, 'item-0');
});
