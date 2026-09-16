import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import {
  presentationFrameZod,
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
 * PRODUCER-INTENT BINDING for staged updates.
 *
 * The live invariant under test: nothing on air changes unless a producer
 * explicitly commanded THAT change. `push-update` promotes `state.stagedUpdate`
 * onto whatever `stagedUpdate.destination` says - so a caller that formed its
 * intent against a CUE refresh, and then pushed without naming what it meant,
 * used to promote whatever happened to be staged by the time the push landed.
 * If that was a PROGRAM refresh staged by another operator in between, the
 * program changed on air with nobody having pressed Push for it.
 *
 * Every reproduction below is the real two-call window, driven over plain HTTP
 * through the real controller, coordinator and SQLite repository - no browser,
 * no socket. The shared-origin one is the case an "also compare the origin"
 * fix would pass while remaining broken: `take` deliberately preserves the cue
 * (see `PlaybackProgram.take`), so after a take the cue and the program share
 * one target and ONLY `destination` tells the two staged updates apart.
 */

const NOW = '2026-01-01T00:00:00.000Z';

/** Each stats flight returns a distinct value, so a wrongly promoted frame is visible rather than byte-identical to what it replaced. */
class CountingStats {
  queryFreshCount = 0;
  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return [{ slug: 'score', catalogueId: 'CAT-SCORE' }];
  }
  async query(): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    throw new Error('the authoritative playback path must never use query()');
  }
  async queryFresh(): Promise<{
    result: StatResult;
    calculatedAsOfUtc: string;
  }> {
    this.queryFreshCount++;
    return {
      result: {
        status: 'ok',
        data: { value: this.queryFreshCount },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  }
}

const fakePrepareFrame: typeof prepareGraphicFrame = (result, spec, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  const value = (result.data as { value: number }).value;
  return presentationFrameZod.parse({
    schemaVersion: 2,
    kind: spec.kind,
    title: spec.title,
    asOfUtc: ctx.asOfUtc,
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind: 'stat-tile',
      values: [
        {
          id: 'v1',
          label: 'Score',
          value,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
};

async function fixture(t: TestContext) {
  const { app, repository } = await graphicsFixture(t);
  const stats = new CountingStats();
  await app.register(graphicsPlaybackController, {
    prefix: '/graphics',
    repository,
    stats,
    prepareFrame: fakePrepareFrame,
    now: () => NOW,
    authorityEpoch: 'push-intent-authority'
  });
  return { app, repository, stats };
}

type App = Awaited<ReturnType<typeof fixture>>['app'];
type Repository = Awaited<ReturnType<typeof fixture>>['repository'];

const ackOf = (res: { json(): unknown }) =>
  res.json() as PlaybackAcknowledgment;

async function command(
  app: App,
  url: string,
  body?: Record<string, unknown>
): Promise<PlaybackAcknowledgment> {
  const res = await app.inject({
    method: 'POST',
    url,
    ...(body ? { payload: body } : {})
  });
  return ackOf(res);
}

function okState(ack: PlaybackAcknowledgment, what: string): PlaybackState {
  assert.equal(
    ack.ok,
    true,
    `${what} should have succeeded: ${ack.ok ? '' : ack.error.message}`
  );
  if (!ack.ok) throw new Error('unreachable');
  return ack.state;
}

function rejection(ack: PlaybackAcknowledgment): string {
  assert.equal(ack.ok, false, 'the command should have been rejected');
  if (ack.ok) throw new Error('unreachable');
  return ack.error.message;
}

/** The single value the fake frame carries, i.e. WHICH stats flight produced what is on air. */
function programValue(state: PlaybackState): number {
  const data = state.program?.graphic.frame.data;
  assert.ok(data && data.kind === 'stat-tile', 'program must carry a stat tile');
  return data.values[0].value as number;
}

/** Everything about the program lane that must be untouched afterwards. */
function programFingerprint(state: PlaybackState) {
  return {
    value: programValue(state),
    targetRevision: state.program?.graphic.target.targetRevision,
    targetId: state.program?.graphic.target.targetId,
    revision: state.program?.revision
  };
}

async function currentState(
  app: App,
  eventKey: string
): Promise<PlaybackState> {
  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live`
  });
  assert.equal(res.statusCode, 200);
  return res.json() as PlaybackState;
}

function seed(app: App, repository: Repository, eventKey: string) {
  return repository.createTimeline(eventKey, {
    timelineId: 'timeline-1',
    name: 'Timeline 1',
    items: [sampleGraphic('item-0'), sampleGraphic('item-1')]
  });
}

/** Load item 0, take it to air, advance to item 1's cue. Cue and program then name DIFFERENT targets. */
async function loadTakeAdvance(app: App, eventKey: string) {
  okState(
    await command(app, `/graphics/${eventKey}/live/load/timeline-1`),
    'load'
  );
  const afterTake = okState(
    await command(app, `/graphics/${eventKey}/live/take`),
    'take'
  );
  okState(await command(app, `/graphics/${eventKey}/live/advance`), 'advance');
  return afterTake;
}

test('an unqualified push never puts a staged program update on air: it is rejected, naming how to ask for it', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  const afterTake = await loadTakeAdvance(app, eventKey);
  const before = programFingerprint(afterTake);

  // The background post-advance cue refresh stages its result...
  const staged = okState(
    await command(app, `/graphics/${eventKey}/live/refresh/cue`),
    'background cue refresh'
  );
  assert.equal(
    staged.stagedUpdate.status === 'ready' && staged.stagedUpdate.destination,
    'cue'
  );
  // ...and another operator stages a PROGRAM refresh before the push lands.
  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`),
    "another operator's program refresh"
  );

  const message = rejection(
    await command(app, `/graphics/${eventKey}/live/push-update`)
  );
  assert.match(message, /program update/);
  assert.match(message, /push-update\/program/);
  assert.match(message, /Nothing was promoted/);

  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'nobody pressed Push for the program: it must be byte-identical'
  );
});

test('a cue-intent push is rejected, not silently redirected, when a program update is staged instead', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  const afterTake = await loadTakeAdvance(app, eventKey);
  const before = programFingerprint(afterTake);

  const staged = okState(
    await command(app, `/graphics/${eventKey}/live/refresh/cue`),
    'cue refresh'
  );
  assert.equal(staged.stagedUpdate.status, 'ready');
  if (staged.stagedUpdate.status !== 'ready') return;
  const cueOrigin = staged.stagedUpdate.origin;

  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`),
    "another operator's program refresh"
  );

  // The caller names exactly what it formed its intent against.
  const message = rejection(
    await command(app, `/graphics/${eventKey}/live/push-update`, {
      destination: 'cue',
      target: cueOrigin
    })
  );
  assert.match(message, /cue update/);
  assert.match(message, /program update/);
  assert.match(message, /Nothing was promoted/);

  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'the program must not move'
  );
});

test('after a take, when cue and program share one origin, a cue-intent push never promotes the program update', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);

  okState(
    await command(app, `/graphics/${eventKey}/live/load/timeline-1`),
    'load'
  );
  const afterTake = okState(
    await command(app, `/graphics/${eventKey}/live/take`),
    'take'
  );
  // `take` preserves the cue, so both lanes now name the SAME target: an
  // origin-only intent check cannot tell the two staged updates apart, and
  // would pass this test while leaving the invariant broken.
  assert.equal(afterTake.cue.status, 'ready');
  if (afterTake.cue.status !== 'ready') return;
  const sharedTarget = afterTake.cue.graphic.target;
  assert.deepEqual(afterTake.program?.graphic.target, sharedTarget);
  const before = programFingerprint(afterTake);

  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/cue`, {
      target: sharedTarget
    }),
    'cue refresh'
  );
  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`, {
      target: sharedTarget
    }),
    "another operator's program refresh"
  );

  assert.match(
    rejection(
      await command(app, `/graphics/${eventKey}/live/push-update`, {
        destination: 'cue',
        target: sharedTarget
      })
    ),
    /Nothing was promoted/
  );
  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'the program must not move'
  );

  // And the bare unqualified push is refused in the same state, rather than
  // falling back to "whatever is staged" and airing the program update.
  assert.match(
    rejection(await command(app, `/graphics/${eventKey}/live/push-update`)),
    /Nothing was promoted/
  );
  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'the program must still not move'
  );
});

test('refresh+push is one command with no window: it promotes its own result and never another staged update', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  const afterTake = await loadTakeAdvance(app, eventKey);
  const before = programFingerprint(afterTake);

  // Someone else's program update is sitting staged when the background cue
  // recalculation runs. It is superseded, never promoted.
  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`),
    "another operator's program refresh"
  );

  const after = okState(
    await command(app, `/graphics/${eventKey}/live/refresh/cue/push`),
    'atomic cue refresh + push'
  );

  assert.equal(
    after.stagedUpdate.status,
    'empty',
    'the command consumed its own staged result'
  );
  assert.deepEqual(
    programFingerprint(after),
    before,
    'a cue refresh+push can never touch the program'
  );
  assert.equal(after.cue.status, 'ready');
  if (after.cue.status !== 'ready') return;
  // The cue really did get this command's own fresh numbers (the 4th flight:
  // load, advance, the program refresh, then this one).
  const data = after.cue.graphic.frame.data;
  assert.ok(data.kind === 'stat-tile');
  assert.equal(data.values[0].value, 4);
  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'durably: the program never moved'
  );
});

test('refresh+push on the program is the explicit one-command way to air a recalculation, body-less', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  okState(
    await command(app, `/graphics/${eventKey}/live/load/timeline-1`),
    'load'
  );
  const afterTake = okState(
    await command(app, `/graphics/${eventKey}/live/take`),
    'take'
  );
  assert.equal(programValue(afterTake), 1);

  // A GET with no payload: the Companion path, one press, fully headless.
  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/live/refresh/program/push`
  });
  assert.equal(res.statusCode, 200);
  const after = okState(ackOf(res), 'program refresh + push');
  assert.equal(
    programValue(after),
    2,
    'the producer asked for exactly this, in this one request'
  );
  assert.equal(after.stagedUpdate.status, 'empty');
  assert.ok(after.transition, 'airing a new frame writes a transition');
});

test('a qualified push promotes the update it names, and consumes only that one', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  await loadTakeAdvance(app, eventKey);

  const staged = okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`),
    'program refresh'
  );
  assert.equal(staged.stagedUpdate.status, 'ready');
  if (staged.stagedUpdate.status !== 'ready') return;

  const after = okState(
    await command(app, `/graphics/${eventKey}/live/push-update/program`, {
      target: staged.stagedUpdate.origin,
      expectedRevision: staged.revision
    }),
    'qualified program push'
  );
  assert.equal(programValue(after), 3, 'the producer asked for this one');
  assert.equal(after.stagedUpdate.status, 'empty');
});

test('a push whose path and body disagree about the destination is refused outright', async (t) => {
  const { app, repository } = await fixture(t);
  const eventKey = 'event-a';
  await seed(app, repository, eventKey);
  const afterTake = await loadTakeAdvance(app, eventKey);
  const before = programFingerprint(afterTake);

  okState(
    await command(app, `/graphics/${eventKey}/live/refresh/program`),
    'program refresh'
  );
  assert.match(
    rejection(
      await command(app, `/graphics/${eventKey}/live/push-update/program`, {
        destination: 'cue'
      })
    ),
    /Send one destination/
  );
  assert.deepEqual(
    programFingerprint(await currentState(app, eventKey)),
    before,
    'an ambiguous request changes nothing'
  );
});
