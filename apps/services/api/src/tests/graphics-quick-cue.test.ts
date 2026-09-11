import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import {
  presentationFrameZod,
  type GraphicSpec,
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
 * Route-level tests for `POST/GET /:eventKey/live/quick-cue/:timelineId` -
 * the one-call "load it, and decide (or be told) whether it also goes to
 * air" command. Fixture/fake setup mirrors `graphics-playback-routes.test.ts`
 * exactly (a real Fastify instance via `app.inject()`, a real SQLite-backed
 * `GraphicsRepository`, only `stats`/`prepareFrame` faked).
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
  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return this.catalogueEntries;
  }
  async query(): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    return {
      result: {
        status: 'ok',
        data: { value: 42 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  }
  async queryFresh() {
    return this.query();
  }
}

async function playbackFixture(t: TestContext) {
  const { app, repository, root } = await graphicsFixture(t);
  await app.register(graphicsPlaybackController, {
    prefix: '/graphics',
    repository,
    stats: new FakeStats(),
    prepareFrame: fakePrepareFrame,
    now: () => NOW
  });
  return { app, repository, root };
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

/** A timeline whose one item has an unfilled `teamKey` binding - `load` alone leaves it a failed cue ("Fill in: team"), never a rejection, per `PlaybackNavigation`'s contract. */
function seedTemplatedTimeline(
  repository: Repository,
  eventKey: string,
  timelineId: string,
  itemId: string
) {
  return repository.createTimeline(eventKey, {
    timelineId,
    name: `Timeline ${timelineId}`,
    items: [{ ...sampleGraphic(itemId), bindings: { teamKey: 'team' } }],
    variables: [{ name: 'team', kind: 'team' }]
  });
}

function ackOf(res: { json(): unknown }): PlaybackAcknowledgment {
  return res.json() as PlaybackAcknowledgment;
}

test('quick-cue: nothing on air -> loads AND takes it (default, force-active unset)', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', [
    'a-item-0',
    'a-item-1'
  ]);

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-a`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  // On item 1 (index 0) of the timeline, and it actually went to air.
  assert.equal(ack.state.loaded?.index, 0);
  assert.equal(ack.state.program?.graphic.spec.id, 'a-item-0');
  assert.equal(ack.state.cue.status, 'ready');
});

test('quick-cue: something already on air -> loads only, leaving the current program exactly as it is (default)', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', ['a-item-0']);
  await seedTimeline(repository, eventKey, 'timeline-b', ['b-item-0']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-a`
  });
  const takeAck = ackOf(
    await app.inject({ method: 'POST', url: `/graphics/${eventKey}/live/take` })
  ) as { ok: true; state: PlaybackState };
  const programTarget = takeAck.state.program!.graphic.target;

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-b`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  // Program A is completely untouched...
  assert.deepEqual(ack.state.program?.graphic.target, programTarget);
  assert.equal(ack.state.program?.graphic.spec.id, 'a-item-0');
  // ...while timeline B is now loaded and cued, ready, sitting off air ("on deck").
  assert.equal(
    ack.state.loaded?.source.kind === 'timeline' &&
      ack.state.loaded.source.timelineId,
    'timeline-b'
  );
  assert.equal(ack.state.loaded?.index, 0);
  assert.equal(
    ack.state.cue.status === 'ready' && ack.state.cue.graphic.spec.id,
    'b-item-0'
  );
});

test('quick-cue: force-active=in always ends up on air, animating out whatever was on first', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', ['a-item-0']);
  await seedTimeline(repository, eventKey, 'timeline-b', ['b-item-0']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-a`
  });
  await app.inject({ method: 'POST', url: `/graphics/${eventKey}/live/take` });

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-b?force-active=in`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  // B forced its way onto air, replacing A.
  assert.equal(ack.state.program?.graphic.spec.id, 'b-item-0');
  assert.equal(ack.state.loaded?.index, 0);
});

test('quick-cue: force-active=out always ends up loaded/cued but off air, animating out whatever was on first', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', ['a-item-0']);
  await seedTimeline(repository, eventKey, 'timeline-b', ['b-item-0']);
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/load/timeline-a`
  });
  await app.inject({ method: 'POST', url: `/graphics/${eventKey}/live/take` });

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-b?force-active=out`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  // A was animated out (program cleared)...
  assert.equal(ack.state.program, null);
  // ...and B sits loaded on item 1, cued and ready, but never taken.
  assert.equal(
    ack.state.loaded?.source.kind === 'timeline' &&
      ack.state.loaded.source.timelineId,
    'timeline-b'
  );
  assert.equal(ack.state.loaded?.index, 0);
  assert.equal(
    ack.state.cue.status === 'ready' && ack.state.cue.graphic.spec.id,
    'b-item-0'
  );
});

test('quick-cue: force-active=out with nothing on air still just loads, never takes', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', ['a-item-0']);

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-a?force-active=out`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.program, null);
  assert.equal(ack.state.cue.status, 'ready');
});

test('quick-cue: works body-less over GET, exactly like every other Companion-facing route', async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTimeline(repository, eventKey, 'timeline-a', ['a-item-0']);

  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-a`
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.program?.graphic.spec.id, 'a-item-0');
});

test('quick-cue: an unknown timeline id is rejected with 404, and nothing on air is disturbed', async (t) => {
  const { app } = await playbackFixture(t);
  const eventKey = 'event-a';
  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/does-not-exist`
  });
  assert.equal(res.statusCode, 404);
  const ack = ackOf(res);
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_FOUND');
});

test("quick-cue: `values` resolves a templated timeline's bindings so it can actually be taken live", async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTemplatedTimeline(repository, eventKey, 'timeline-t', 'item-t');

  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-t`,
    payload: { values: { team: 1114 } }
  });
  assert.equal(res.statusCode, 200);
  const ack = ackOf(res);
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'ready');
  assert.ok(ack.state.program, 'the resolved graphic actually went to air');
});

test("quick-cue: an unresolved template binding surfaces as this call's own rejection instead of a silent no-op take", async (t) => {
  const { app, repository } = await playbackFixture(t);
  const eventKey = 'event-a';
  await seedTemplatedTimeline(repository, eventKey, 'timeline-t', 'item-t');

  // No `values` supplied, and nothing is on air, so quick-cue's default behaviour would try to
  // take this live - `load` alone leaves the cue merely `failed`, but quick-cue is ABOUT to air
  // it, so this must come back as a rejection, not a 200 with a silently-not-taken cue.
  const res = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/live/quick-cue/timeline-t`
  });
  assert.equal(res.statusCode, 400);
  const ack = ackOf(res);
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'INVALID_INPUT');
  assert.match(ack.error.message, /Fill in: team/);
  // Nothing was ever taken to air.
  assert.equal(ack.state?.program, null);
});
