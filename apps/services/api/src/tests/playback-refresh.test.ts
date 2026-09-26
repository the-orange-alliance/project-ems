import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyPlaybackState,
  presentationFrameZod,
  snapshotPreparedGraphic,
  type GraphicSpec,
  type GraphicsTarget,
  type PlaybackState
} from '@toa-lib/models/base';
import {
  prepareGraphicFrame,
  type StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import {
  PlaybackCoordinator,
  type PlaybackCommandRecord,
  type PlaybackStorage
} from '../graphics/PlaybackCoordinator.js';
import {
  PlaybackRefresh,
  type LoadRefreshEntities,
  type PlaybackRefreshStats
} from '../graphics/PlaybackRefresh.js';

/**
 * Every test in this file drives `PlaybackRefresh` by direct function call
 * against in-memory fakes: no Fastify instance is created anywhere below,
 * and no producer socket is ever connected. That is deliberate - it is the
 * property this module exists to guarantee (a Companion button with nothing
 * else running must be able to recalculate and promote a graphic on the
 * broadcast).
 *
 * The product rule under test throughout: `refresh` NEVER changes what is
 * on air. It stages into `stagedUpdate` and stops at `ready`; only an
 * explicit `push-update` promotes it. "program stays exactly on air" /
 * "never auto-promoted" assertions appear in nearly every test below.
 */

const NOW = new Date('2026-01-01T00:00:00.000Z').toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function spec(id: string, overrides: Partial<GraphicSpec> = {}): GraphicSpec {
  return {
    id,
    title: `Title ${id}`,
    stat: 'score',
    selectors: {},
    filters: {},
    params: {},
    kind: 'stat-tile',
    mode: 'fullscreen',
    options: {},
    ...overrides
  };
}

function fakeFrame(s: GraphicSpec, asOfUtc: string, value: number = 42) {
  return presentationFrameZod.parse({
    schemaVersion: 2,
    kind: s.kind,
    title: s.title,
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
          value,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
}

/** Default fake `prepareFrame`: deterministic, reads the numeric value straight off a well-formed 'ok' result. */
const fakePrepareFrame: typeof prepareGraphicFrame = (result, s, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  const value =
    typeof (result.data as { value?: unknown }).value === 'number'
      ? (result.data as { value: number }).value
      : 42;
  return fakeFrame(s, ctx.asOfUtc, value);
};

function frameValue(frame: unknown): unknown {
  return (frame as { data: { values: { value: unknown }[] } }).data.values[0]
    ?.value;
}

class FakeStats implements PlaybackRefreshStats {
  catalogueEntries: { slug: string; catalogueId: string }[] = [
    { slug: 'score', catalogueId: 'CAT-SCORE' }
  ];
  queryFreshImpl: (
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
  queryCount = 0;
  queryFreshCount = 0;
  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return this.catalogueEntries;
  }
  /** PlaybackRefresh must never call this - stale-while-refresh semantics would lie about what "recalculate" did. */
  async query(): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    this.queryCount++;
    throw new Error(
      'FakeStats.query should never be called by PlaybackRefresh; it must use queryFresh.'
    );
  }
  async queryFresh(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    this.queryFreshCount++;
    return this.queryFreshImpl(eventKey, input);
  }
}

/** Pure in-memory stand-in for `GraphicsRepository`'s storage side: no SQLite anywhere in this file. */
class MemoryStorage implements PlaybackStorage {
  private states = new Map<string, PlaybackState>();
  private commands = new Map<string, PlaybackCommandRecord>();
  async loadPlayback(eventKey: string): Promise<PlaybackState> {
    return clone(
      this.states.get(eventKey) ?? createEmptyPlaybackState(eventKey)
    );
  }
  async savePlayback(
    eventKey: string,
    state: PlaybackState,
    expectedRevision: number,
    command?: PlaybackCommandRecord
  ): Promise<PlaybackState> {
    const current =
      this.states.get(eventKey) ?? createEmptyPlaybackState(eventKey);
    if (current.revision !== expectedRevision)
      throw new Error('Playback revision changed');
    this.states.set(eventKey, clone(state));
    if (command)
      this.commands.set(`${eventKey}:${command.requestId}`, clone(command));
    return clone(state);
  }
  async loadCommand(
    eventKey: string,
    requestId: string
  ): Promise<PlaybackCommandRecord | null> {
    const found = this.commands.get(`${eventKey}:${requestId}`);
    return found ? clone(found) : null;
  }
}

function setup(
  overrides: {
    loadEntities?: LoadRefreshEntities;
    prepareFrame?: typeof prepareGraphicFrame;
  } = {}
) {
  const storage = new MemoryStorage();
  const coordinator = new PlaybackCoordinator({ storage });
  const stats = new FakeStats();
  const refresh = new PlaybackRefresh({
    coordinator,
    stats,
    loadEntities: overrides.loadEntities ?? (async () => ({})),
    prepareFrame: overrides.prepareFrame ?? fakePrepareFrame,
    now: () => NOW
  });
  return { refresh, coordinator, stats, storage };
}

/**
 * Readies a cue at a fresh target via the coordinator's own ticket flow
 * directly (the `'cue'` command - a plain prepare-only operation), bypassing
 * both sibling operation modules. Used to build "there is a ready cue" /
 * "there is a ready program" preconditions without pulling in navigation or
 * program machinery this file must not depend on.
 */
async function readyCueTarget(
  coordinator: PlaybackCoordinator,
  eventKey: string,
  requestId: string,
  s: GraphicSpec,
  /** Show coordinates for the cued graphic; the default is an ad-hoc graphic with no show position. */
  position:
    | { snapshotId: string; index: number }
    | { snapshotId?: null; index?: null } = { snapshotId: null, index: null }
): Promise<GraphicsTarget> {
  const acceptance = await coordinator.beginPreparation(
    eventKey,
    { type: 'cue', requestId, spec: s },
    { lane: 'cue', ...position, spec: s }
  );
  if (!acceptance.ticket) throw new Error('expected a preparation ticket');
  const { ticket } = acceptance;
  const ack = await coordinator.completePreparation(ticket, {
    target: ticket.target,
    spec: ticket.spec,
    frame: fakeFrame(s, NOW),
    preparedAtUtc: NOW
  });
  if (!ack.ok)
    throw new Error(
      `expected completePreparation to succeed: ${JSON.stringify(ack)}`
    );
  return ticket.target;
}

/** Minimal, local stand-in for `PlaybackProgram.take` - puts the CURRENT ready cue onto program. No transition math: irrelevant to this module's own tests. */
async function takeOntoProgram(
  coordinator: PlaybackCoordinator,
  eventKey: string,
  requestId: string,
  target: GraphicsTarget
): Promise<void> {
  const ack = await coordinator.mutate(
    eventKey,
    { type: 'take', requestId, target },
    (draft, context) => {
      if (draft.cue.status !== 'ready')
        throw new Error('cue is not ready for takeOntoProgram');
      draft.program = {
        revision: context.nextRevision,
        graphic: snapshotPreparedGraphic(draft.cue.graphic),
        takenAtUtc: context.now
      };
    }
  );
  if (!ack.ok)
    throw new Error(`expected take to succeed: ${JSON.stringify(ack)}`);
}

/** Minimal, local stand-in for `PlaybackProgram.clear`. */
async function clearProgram(
  coordinator: PlaybackCoordinator,
  eventKey: string,
  requestId: string
): Promise<void> {
  const ack = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId },
    (draft) => {
      draft.program = null;
    }
  );
  if (!ack.ok)
    throw new Error(`expected clear to succeed: ${JSON.stringify(ack)}`);
}

async function waitUntil(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 5000
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil timed out');
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

/* -------------------------------------------------------------------- */
/* refresh                                                               */
/* -------------------------------------------------------------------- */

test('refresh (program, headless - no Fastify, no producer socket): stages calculating -> ready while the program on air remains byte-identical throughout', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const programBefore = (await coordinator.getState('event-a')).program;

  stats.queryFreshImpl = async () => {
    const mid = await coordinator.getState('event-a');
    assert.equal(mid.stagedUpdate.status, 'calculating');
    assert.deepEqual(mid.program, programBefore);
    return {
      result: {
        status: 'ok',
        data: { value: 42 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  };

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'ready');
  assert.deepEqual(ack.state.program, programBefore);

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, programBefore);
});

test('refresh: unchanged computed values still reach "ready" - a refresh that recomputes the exact same value is not silently suppressed', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const before = await coordinator.getState('event-a');
  const beforeValue = frameValue(before.program?.graphic.frame) as number;

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: beforeValue },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'ready');
  if (ack.state.stagedUpdate.status === 'ready') {
    assert.equal(frameValue(ack.state.stagedUpdate.graphic.frame), beforeValue);
  }
});

test('refresh: uses queryFresh, never the stale-while-refresh query', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  assert.equal(stats.queryFreshCount, 1);
  assert.equal(stats.queryCount, 0);
});

test('refresh (program): a non-ok stats result ends stagedUpdate failed, retryable, with provenance naming the stat and target - program stays exactly on air', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('score-panel', { stat: 'score' })
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const programBefore = (await coordinator.getState('event-a')).program;

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'insufficient_data',
      reason: 'No eligible observations',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'failed');
  if (ack.state.stagedUpdate.status === 'failed') {
    assert.equal(ack.state.stagedUpdate.error.code, 'CALCULATION_FAILED');
    assert.equal(
      ack.state.stagedUpdate.error.retryable,
      true,
      'a failed refresh must be retryable so the producer can press recalculate again'
    );
    assert.match(ack.state.stagedUpdate.error.message, /score/);
    assert.match(
      ack.state.stagedUpdate.error.message,
      new RegExp(target.targetId)
    );
    assert.deepEqual(ack.state.stagedUpdate.origin, target);
    assert.equal(ack.state.stagedUpdate.requestId, 'r1');
  }
  assert.deepEqual(ack.state.program, programBefore);
});

test('refresh (program): a thrown queryFresh error ends stagedUpdate failed (never stuck calculating), program stays exactly on air', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const programBefore = (await coordinator.getState('event-a')).program;

  stats.queryFreshImpl = async () => {
    throw new Error('stats backend unavailable');
  };

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'failed');
  assert.notEqual(ack.state.stagedUpdate.status, 'calculating');
  assert.deepEqual(ack.state.program, programBefore);
});

test('refresh (program): a prepared frame that fails presentationFrameZod is PRESENTATION_FAILED, program stays exactly on air, staged never reaches ready', async () => {
  const badPrepareFrame: typeof prepareGraphicFrame = () =>
    ({
      schemaVersion: 2,
      kind: 'bar',
      title: 'bad',
      asOfUtc: NOW,
      quality: 'complete',
      warnings: [],
      series: [],
      data: { kind: 'stat-tile', values: [] } // kind/data.kind mismatch -> presentationFrameZod refine fails
    }) as unknown as ReturnType<typeof prepareGraphicFrame>;
  const { refresh, coordinator } = setup({ prepareFrame: badPrepareFrame });
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const programBefore = (await coordinator.getState('event-a')).program;

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'failed');
  if (ack.state.stagedUpdate.status === 'failed')
    assert.equal(ack.state.stagedUpdate.error.code, 'PRESENTATION_FAILED');
  assert.deepEqual(ack.state.program, programBefore);
});

test('refresh (program): an origin that is no longer the live program target is rejected SUPERSEDED at beginPreparation, and queryFresh is never called', async () => {
  const { refresh, coordinator, stats } = setup();
  const target1 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target1);
  const target2 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue2',
    spec('g2')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take2', target2);

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target: target1
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'SUPERSEDED');
  assert.equal(stats.queryFreshCount, 0);
});

test('refresh (program): a different Take landing strictly between beginPreparation and completePreparation supersedes the completion; the newly taken graphic stays on air', async () => {
  const { refresh, coordinator, stats } = setup();
  const target1 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target1);
  const target2 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue2',
    spec('g2')
  );

  stats.queryFreshImpl = async () => {
    // A different graphic is taken while the refresh's own query is still outstanding.
    await takeOntoProgram(coordinator, 'event-a', 'take2', target2);
    return {
      result: {
        status: 'ok',
        data: { value: 99 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  };

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target: target1
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'SUPERSEDED');

  const state = await coordinator.getState('event-a');
  assert.ok(state.program);
  if (state.program) assert.deepEqual(state.program.graphic.target, target2);
  assert.notEqual(state.stagedUpdate.status, 'ready');
});

test('refresh: replaying the same requestId returns the original acknowledgment and runs queryFresh only once', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  const first = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'dup-r',
    destination: 'program',
    target
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.replayed, false);
  assert.equal(stats.queryFreshCount, 1);

  const second = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'dup-r',
    destination: 'program',
    target
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(
    stats.queryFreshCount,
    1,
    'no second queryFresh call ran for the replayed requestId'
  );
  assert.equal(second.replayed, true);
  assert.deepEqual(second.state, first.state);
});

test("refresh: two DIFFERENT requestIds - the second supersedes the first; the first's completion is rejected SUPERSEDED; the staged result is the second", async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  let releaseFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let calls = 0;
  stats.queryFreshImpl = async () => {
    calls++;
    if (calls === 1) {
      await firstGate;
      return {
        result: {
          status: 'ok',
          data: { value: 1 },
          quality: 'complete',
          warnings: []
        },
        calculatedAsOfUtc: NOW
      };
    }
    return {
      result: {
        status: 'ok',
        data: { value: 2 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  };

  const firstPromise = refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  await waitUntil(async () => {
    const s = await coordinator.getState('event-a');
    return (
      s.stagedUpdate.status === 'calculating' &&
      s.stagedUpdate.requestId === 'r1'
    );
  });

  const secondAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r2',
    destination: 'program',
    target
  });
  assert.equal(secondAck.ok, true);
  if (!secondAck.ok) return;
  assert.equal(secondAck.state.stagedUpdate.status, 'ready');
  if (secondAck.state.stagedUpdate.status === 'ready')
    assert.equal(frameValue(secondAck.state.stagedUpdate.graphic.frame), 2);

  releaseFirst?.();
  const firstAck = await firstPromise;
  assert.equal(firstAck.ok, false);
  if (firstAck.ok) return;
  assert.equal(firstAck.error.code, 'SUPERSEDED');

  const finalState = await coordinator.getState('event-a');
  assert.equal(finalState.stagedUpdate.status, 'ready');
  if (finalState.stagedUpdate.status === 'ready')
    assert.equal(frameValue(finalState.stagedUpdate.graphic.frame), 2);
});

test('refresh (cue): recalculates the cue graphic the same way as program, without ever touching program', async () => {
  const { refresh, coordinator } = setup();
  const cueTarget = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const programBefore = (await coordinator.getState('event-a')).program;
  assert.equal(programBefore, null);

  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'cue',
    target: cueTarget
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'ready');
  if (ack.state.stagedUpdate.status === 'ready')
    assert.equal(ack.state.stagedUpdate.destination, 'cue');
  assert.equal(ack.state.program, null);
  // The live cue itself is untouched by refresh alone - only push-update promotes it.
  assert.equal(ack.state.cue.status, 'ready');
  if (ack.state.cue.status === 'ready')
    assert.deepEqual(ack.state.cue.graphic.target, cueTarget);
});

test('refresh: a ready staged update is never auto-promoted - program never changes without an explicit push-update', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  const programBefore = (await coordinator.getState('event-a')).program;

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 123 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const ack = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.stagedUpdate.status, 'ready');
  assert.deepEqual(ack.state.program, programBefore);

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, programBefore);
});

/* -------------------------------------------------------------------- */
/* push-update                                                           */
/* -------------------------------------------------------------------- */

test('push-update (program): promotes the staged graphic, resets stagedUpdate to empty, writes a same-mode crossfade transition', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 7 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');
  const stagedGraphic =
    refreshAck.state.stagedUpdate.status === 'ready'
      ? refreshAck.state.stagedUpdate.graphic
      : undefined;
  assert.ok(stagedGraphic);

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, true);
  if (!pushAck.ok) return;
  assert.equal(pushAck.state.stagedUpdate.status, 'empty');
  assert.deepEqual(pushAck.state.program?.graphic, stagedGraphic);
  assert.equal(pushAck.state.transition?.crossfadeMs, 300);
  assert.equal(pushAck.state.transition?.exitMs, 0);
  assert.equal(pushAck.state.transition?.enterMs, 0);
  assert.equal(pushAck.state.transition?.gapMs, 250);
});

test('push-update (cue): promotes the staged cue graphic, writes NO transition, and leaves program untouched', async () => {
  const { refresh, coordinator, stats } = setup();
  const progTarget = await readyCueTarget(
    coordinator,
    'event-a',
    'cue-prog',
    spec('g-prog')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take-prog', progTarget);
  const cueTarget = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const programBeforePush = (await coordinator.getState('event-a')).program;

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 11 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'cue',
    target: cueTarget
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target: cueTarget
  });
  assert.equal(pushAck.ok, true);
  if (!pushAck.ok) return;
  assert.equal(pushAck.state.stagedUpdate.status, 'empty');
  assert.equal(pushAck.state.cue.status, 'ready');
  if (pushAck.state.cue.status === 'ready')
    assert.equal(frameValue(pushAck.state.cue.graphic.frame), 11);
  assert.deepEqual(pushAck.state.program, programBeforePush);
  assert.equal(pushAck.state.transition, null);
});

test('push-update: staged "calculating" is NOT_READY and changes nothing', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  let releaseQuery: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    releaseQuery = resolve;
  });
  stats.queryFreshImpl = async () => {
    await gate;
    return {
      result: {
        status: 'ok',
        data: { value: 1 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    };
  };

  const refreshPromise = refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  await waitUntil(
    async () =>
      (await coordinator.getState('event-a')).stagedUpdate.status ===
      'calculating'
  );

  const before = await coordinator.getState('event-a');
  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, false);
  if (pushAck.ok) return;
  assert.equal(pushAck.error.code, 'NOT_READY');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, before.program);
  assert.deepEqual(after.stagedUpdate, before.stagedUpdate);

  releaseQuery?.();
  await refreshPromise;
});

test('push-update: staged "empty" is NOT_READY', async () => {
  const { refresh, coordinator } = setup();
  const bogusTarget: GraphicsTarget = {
    targetId: 'ghost',
    targetRevision: 1,
    requestId: 'r1',
    snapshotId: null,
    index: null
  };
  const before = await coordinator.getState('event-a');

  const ack = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target: bogusTarget
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_READY');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});

test('push-update: staged "failed" is NOT_READY', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: { status: 'insufficient_data', reason: 'no data', warnings: [] },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'failed');

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, false);
  if (pushAck.ok) return;
  assert.equal(pushAck.error.code, 'NOT_READY');
});

test("push-update: after a Clear, SUPERSEDED - air stays cleared (the operator's clear wins)", async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 5 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');

  await clearProgram(coordinator, 'event-a', 'clear1');

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, false);
  if (pushAck.ok) return;
  assert.equal(pushAck.error.code, 'SUPERSEDED');
  const state = await coordinator.getState('event-a');
  assert.equal(state.program, null);
});

test('push-update: after a DIFFERENT Take, SUPERSEDED - the newly taken graphic stays exactly on air', async () => {
  const { refresh, coordinator, stats } = setup();
  const target1 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target1);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 5 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target: target1
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');

  const target2 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue2',
    spec('g2')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take2', target2);
  const programAfterTake2 = (await coordinator.getState('event-a')).program;

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target: target1
  });
  assert.equal(pushAck.ok, false);
  if (pushAck.ok) return;
  assert.equal(pushAck.error.code, 'SUPERSEDED');
  const state = await coordinator.getState('event-a');
  assert.deepEqual(state.program, programAfterTake2);
});

test('push-update: a target that does not match stagedUpdate.origin is SUPERSEDED', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 5 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');

  const wrongTarget: GraphicsTarget = {
    ...target,
    targetId: `${target.targetId}-wrong`
  };
  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target: wrongTarget
  });
  assert.equal(pushAck.ok, false);
  if (pushAck.ok) return;
  assert.equal(pushAck.error.code, 'SUPERSEDED');
  const state = await coordinator.getState('event-a');
  assert.equal(
    state.stagedUpdate.status,
    'ready',
    'the staged update itself is untouched by a mismatched push'
  );
});

test('push-update: replaying the same requestId returns the original acknowledgment - program is not re-promoted at a new revision', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 5 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);

  const first = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'dup-p',
    target
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.replayed, false);

  const second = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'dup-p',
    target
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.replayed, true);
  assert.deepEqual(second.state, first.state);
});

test("push-update: the promoted graphic is a detached copy - a pre-push handle mutated afterward never leaks into the coordinator's stored program", async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 5 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  assert.equal(refreshAck.state.stagedUpdate.status, 'ready');
  const stagedGraphic =
    refreshAck.state.stagedUpdate.status === 'ready'
      ? refreshAck.state.stagedUpdate.graphic
      : undefined;
  assert.ok(stagedGraphic);

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, true);
  if (!pushAck.ok) return;

  stagedGraphic!.spec.title = 'MUTATED IN PLACE';
  const after = await coordinator.getState('event-a');
  assert.notEqual(after.program?.graphic.spec.title, 'MUTATED IN PLACE');
});

/* -------------------------------------------------------------------- */
/* command routing                                                       */
/* -------------------------------------------------------------------- */

test('handle: dispatches refresh/push-update and throws for anything else', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 1 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });

  const refreshAck = await refresh.handle('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  const pushAck = await refresh.handle('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, true);

  assert.throws(() =>
    refresh.handle('event-a', { type: 'advance', requestId: 'adv1' })
  );
});

/**
 * Regression: a refresh recalculates the graphic ALREADY live at a destination
 * with fresh data - it never moves it. If the promoted copy came back without
 * the show coordinates the graphic was taken at, every consumer that reads the
 * program's position silently regresses after a push; PVW in particular falls
 * back to the loaded cursor and previews the on-air item instead of the next one.
 */
test('push-update (program): the promoted graphic keeps the show coordinates it was taken at', async () => {
  const { refresh, coordinator, stats } = setup();
  const position = { snapshotId: 'snapshot-1', index: 0 } as const;
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1'),
    position
  );
  assert.equal(target.snapshotId, position.snapshotId);
  assert.equal(target.index, position.index);
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);

  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 7 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  if (!refreshAck.ok) return;
  const staged =
    refreshAck.state.stagedUpdate.status === 'ready'
      ? refreshAck.state.stagedUpdate.graphic
      : undefined;
  assert.ok(staged);
  // The staged copy already carries the position, so the promotion cannot lose it.
  assert.equal(staged.target.snapshotId, position.snapshotId);
  assert.equal(staged.target.index, position.index);

  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, true);
  if (!pushAck.ok) return;
  assert.equal(pushAck.state.program?.graphic.target.snapshotId, position.snapshotId);
  assert.equal(pushAck.state.program?.graphic.target.index, position.index);
});

/** A refresh of an ad-hoc graphic that never had a show position must not invent one. */
test('push-update (program): an ad-hoc graphic still promotes with no show coordinates', async () => {
  const { refresh, coordinator, stats } = setup();
  const target = await readyCueTarget(coordinator, 'event-a', 'cue1', spec('g1'));
  await takeOntoProgram(coordinator, 'event-a', 'take1', target);
  stats.queryFreshImpl = async () => ({
    result: {
      status: 'ok',
      data: { value: 7 },
      quality: 'complete',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });
  const refreshAck = await refresh.refresh('event-a', {
    type: 'refresh',
    requestId: 'r1',
    destination: 'program',
    target
  });
  assert.equal(refreshAck.ok, true);
  const pushAck = await refresh.pushUpdate('event-a', {
    type: 'push-update',
    requestId: 'p1',
    target
  });
  assert.equal(pushAck.ok, true);
  if (!pushAck.ok) return;
  assert.equal(pushAck.state.program?.graphic.target.snapshotId, null);
  assert.equal(pushAck.state.program?.graphic.target.index, null);
});
