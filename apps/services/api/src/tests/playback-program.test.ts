import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyPlaybackState,
  presentationFrameZod,
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
  PlaybackProgram,
  type LoadProgramEntities,
  type PlaybackProgramStats
} from '../graphics/PlaybackProgram.js';

/**
 * Every test in this file drives `PlaybackProgram` by direct function call
 * against in-memory fakes: no Fastify instance is created anywhere below,
 * and no producer socket is ever connected. That is deliberate - it is the
 * property this module exists to guarantee (a Companion button with nothing
 * else running must be able to take/clear/quick-take the broadcast).
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

function fakeFrame(s: GraphicSpec, asOfUtc: string) {
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
          value: 42,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
}

/** Default fake `prepareFrame`: deterministic, ignores the actual stat payload. */
const fakePrepareFrame: typeof prepareGraphicFrame = (result, s, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  return fakeFrame(s, ctx.asOfUtc);
};

class FakeStats implements PlaybackProgramStats {
  catalogueEntries: { slug: string; catalogueId: string }[] = [
    { slug: 'score', catalogueId: 'CAT-SCORE' }
  ];
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
  async queryFresh(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    this.queryFreshCount++;
    return this.queryImpl(eventKey, input);
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
    loadEntities?: LoadProgramEntities;
    prepareFrame?: typeof prepareGraphicFrame;
  } = {}
) {
  const storage = new MemoryStorage();
  const coordinator = new PlaybackCoordinator({ storage });
  const stats = new FakeStats();
  const program = new PlaybackProgram({
    coordinator,
    stats,
    loadEntities: overrides.loadEntities ?? (async () => ({})),
    prepareFrame: overrides.prepareFrame ?? fakePrepareFrame,
    now: () => NOW
  });
  return { program, coordinator, stats, storage };
}

/**
 * Readies a cue at a fresh target via the coordinator's own ticket flow
 * directly (the `'cue'` command - a plain prepare-only operation), bypassing
 * both `PlaybackNavigation` (a sibling module this file must not depend on)
 * and `PlaybackProgram` itself. Used to set up "there is a ready cue" or "a
 * different graphic became ready concurrently" preconditions for take/clear
 * tests without pulling in navigation machinery.
 */
async function readyCueTarget(
  coordinator: PlaybackCoordinator,
  eventKey: string,
  requestId: string,
  s: GraphicSpec
): Promise<GraphicsTarget> {
  const acceptance = await coordinator.beginPreparation(
    eventKey,
    { type: 'cue', requestId, spec: s },
    { lane: 'cue', snapshotId: null, index: null, spec: s }
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

/* -------------------------------------------------------------------- */
/* take                                                                  */
/* -------------------------------------------------------------------- */

test('take: headlessly puts a ready cue on air (no Fastify, no producer socket) - cue is preserved, revision and takenAtUtc are set', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.ok(ack.state.program);
  assert.equal(ack.state.program?.revision, ack.state.revision);
  assert.ok(ack.state.program?.takenAtUtc);
  assert.deepEqual(ack.state.program?.graphic.target, target);
  assert.equal(ack.state.cue.status, 'ready');
  if (ack.state.cue.status === 'ready')
    assert.deepEqual(ack.state.cue.graphic.target, target);
});

test('take: a calculating cue is NOT_READY and leaves program unchanged', async () => {
  const { program, coordinator } = setup();
  const s = spec('g1');
  const acceptance = await coordinator.beginPreparation(
    'event-a',
    { type: 'cue', requestId: 'cue1', spec: s },
    { lane: 'cue', snapshotId: null, index: null, spec: s }
  );
  assert.ok(acceptance.ticket);
  const before = await coordinator.getState('event-a');

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target: acceptance.ticket!.target
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_READY');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, before.program);
  assert.equal(after.program, null);
});

test('take: a failed cue is NOT_READY and leaves program unchanged', async () => {
  const { program, coordinator } = setup();
  const s = spec('g1');
  const acceptance = await coordinator.beginPreparation(
    'event-a',
    { type: 'cue', requestId: 'cue1', spec: s },
    { lane: 'cue', snapshotId: null, index: null, spec: s }
  );
  const ticket = acceptance.ticket!;
  const failAck = await coordinator.failPreparation(ticket, {
    code: 'CALCULATION_FAILED',
    message: 'no data',
    retryable: false
  });
  assert.equal(failAck.ok, true);
  const before = await coordinator.getState('event-a');

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target: ticket.target
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_READY');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, before.program);
});

test('take: an empty cue (nothing ever prepared) is NOT_READY and leaves program unchanged', async () => {
  const { program, coordinator } = setup();
  const before = await coordinator.getState('event-a');
  const bogusTarget: GraphicsTarget = {
    targetId: 'ghost',
    targetRevision: 1,
    requestId: 'take1',
    snapshotId: null,
    index: null
  };

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target: bogusTarget
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_READY');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, before.program);
});

test('take: a stale target (cue is ready, but for a DIFFERENT graphic) is SUPERSEDED and the previously aired program stays exactly on air', async () => {
  const { program, coordinator } = setup();
  const target1 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target: target1
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const programBefore = takeAck.state.program;

  // The cue moves on to a different graphic before the operator's stale take arrives.
  await readyCueTarget(coordinator, 'event-a', 'cue2', spec('g2'));

  const staleAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take-stale',
    target: target1
  });
  assert.equal(staleAck.ok, false);
  if (staleAck.ok) return;
  assert.equal(staleAck.error.code, 'SUPERSEDED');
  assert.deepEqual(staleAck.state?.program, programBefore);
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, programBefore);
});

test('take: a mismatched expectedRevision is CONFLICT and leaves program unchanged', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const before = await coordinator.getState('event-a');

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target,
    expectedRevision: before.revision + 5
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'CONFLICT');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after.program, before.program);
});

test('take: replaying the same requestId returns the original acknowledgment - program is not re-taken with a new revision', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );

  const first = await program.take('event-a', {
    type: 'take',
    requestId: 'dup-take',
    target
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.replayed, false);

  const second = await program.take('event-a', {
    type: 'take',
    requestId: 'dup-take',
    target
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.replayed, true);
  assert.deepEqual(second.state, first.state);
});

test('take: program holds a detached copy - mutating the returned cue graphic in place does not affect the returned program graphic', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );

  const ack = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'ready');
  if (ack.state.cue.status !== 'ready') return;
  ack.state.cue.graphic.spec.title = 'MUTATED IN PLACE';
  assert.notEqual(ack.state.program?.graphic.spec.title, 'MUTATED IN PLACE');
  assert.equal(ack.state.program?.graphic.spec.title, `Title g1`);
});

test('take: a later cue change (a fresh prepare on the cue lane) does not touch the program already on air', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const programBefore = takeAck.state.program;

  await readyCueTarget(coordinator, 'event-a', 'cue2', spec('g2'));

  const state = await coordinator.getState('event-a');
  assert.deepEqual(state.program, programBefore);
});

/* -------------------------------------------------------------------- */
/* clear                                                                 */
/* -------------------------------------------------------------------- */

test('clear: takes program to null and preserves a ready cue exactly as it was (still ready)', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const cueBefore = takeAck.state.cue;

  const clearAck = await program.clear('event-a', {
    type: 'clear',
    requestId: 'clear1'
  });
  assert.equal(clearAck.ok, true);
  if (!clearAck.ok) return;
  assert.equal(clearAck.state.program, null);
  assert.equal(clearAck.state.cue.status, 'ready');
  assert.deepEqual(clearAck.state.cue, cueBefore);
});

test('clear: clearing an already-empty program is a success, not an error, and still bumps the revision', async () => {
  const { program, coordinator } = setup();
  const before = await coordinator.getState('event-a');

  const ack = await program.clear('event-a', {
    type: 'clear',
    requestId: 'clear1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.program, null);
  assert.equal(ack.state.revision, before.revision + 1);
});

/* -------------------------------------------------------------------- */
/* quick-take                                                            */
/* -------------------------------------------------------------------- */

test('quick-take: headlessly prepares fresh data and airs it in one commit - cue becomes ready AND program is set in the SAME revision', async () => {
  const { program, coordinator, stats } = setup();

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'ready');
  assert.equal(stats.queryFreshCount, 1);
  assert.ok(ack.state.program);
  assert.equal(
    ack.state.program?.revision,
    ack.state.revision,
    'program was written in the SAME commit that readied the cue, not a later one'
  );
  if (ack.state.cue.status === 'ready')
    assert.deepEqual(ack.state.program?.graphic, ack.state.cue.graphic);
});

test('quick-take: an invalid spec is INVALID_INPUT and changes nothing', async () => {
  const { program, coordinator } = setup();
  const before = await coordinator.getState('event-a');
  const invalidSpec = spec('qt1', { mode: 'lower-third', kind: 'bar' }); // bar does not support lower-third

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: invalidSpec
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'INVALID_INPUT');
  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});

test('quick-take: a non-ok stats result ends the cue failed and leaves the previous program exactly on air (nothing thrown)', async () => {
  const { program, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('base')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const programBefore = takeAck.state.program;

  stats.queryImpl = async () => ({
    result: {
      status: 'insufficient_data',
      reason: 'No eligible observations',
      warnings: []
    },
    calculatedAsOfUtc: NOW
  });

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  if (ack.state.cue.status === 'failed') {
    assert.equal(ack.state.cue.error.code, 'CALCULATION_FAILED');
    assert.equal(ack.state.cue.error.message, 'No eligible observations');
  }
  assert.deepEqual(ack.state.program, programBefore);
});

test('quick-take: a thrown stats error fails the ticket (cue ends failed, never stuck calculating) and leaves the previous program on air', async () => {
  const { program, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('base')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const programBefore = takeAck.state.program;

  stats.queryImpl = async () => {
    throw new Error('stats backend unavailable');
  };

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  assert.notEqual(ack.state.cue.status, 'calculating');
  assert.deepEqual(ack.state.program, programBefore);
});

test('quick-take: a prepared frame that fails presentationFrameZod is PRESENTATION_FAILED and leaves the previous program on air', async () => {
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
  const { program, coordinator } = setup({ prepareFrame: badPrepareFrame });
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('base')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  if (!takeAck.ok) return;
  const programBefore = takeAck.state.program;

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  if (ack.state.cue.status === 'failed')
    assert.equal(ack.state.cue.error.code, 'PRESENTATION_FAILED');
  assert.deepEqual(ack.state.program, programBefore);
});

test('quick-take: a clear landing mid-preparation supersedes it (SUPERSEDED) and the air stays cleared', async () => {
  const { program, coordinator, stats } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('base')
  );
  const takeAck = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);

  stats.queryImpl = async () => {
    // The clear lands and commits BEFORE the deferred stats query "resolves" -
    // i.e. strictly between quick-take's beginPreparation and completePreparation.
    const clearAck = await program.clear('event-a', {
      type: 'clear',
      requestId: 'clear-mid'
    });
    assert.equal(clearAck.ok, true);
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

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'SUPERSEDED');
  const state = await coordinator.getState('event-a');
  assert.equal(state.program, null);
});

test("quick-take: a different take landing mid-preparation supersedes it (SUPERSEDED) and the operator's take stands", async () => {
  const { program, coordinator, stats } = setup();

  stats.queryImpl = async () => {
    // A separate graphic becomes ready and gets taken while the quick-take's own
    // calculation is still outstanding - strictly between its beginPreparation
    // and completePreparation.
    const otherTarget = await readyCueTarget(
      coordinator,
      'event-a',
      'other-cue',
      spec('other')
    );
    const otherTake = await program.take('event-a', {
      type: 'take',
      requestId: 'other-take',
      target: otherTarget
    });
    assert.equal(otherTake.ok, true);
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

  const ack = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'qt1',
    spec: spec('qt1')
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'SUPERSEDED');

  const state = await coordinator.getState('event-a');
  assert.ok(state.program);
  if (state.program) assert.equal(state.program.graphic.spec.id, 'other');
});

test('quick-take: replaying the same requestId returns the original acknowledgment and never runs a second stats query', async () => {
  const { program, stats } = setup();
  let queryCount = 0;
  const baseImpl = stats.queryImpl;
  stats.queryImpl = async (eventKey, input) => {
    queryCount++;
    return baseImpl(eventKey, input);
  };

  const first = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'dup-qt',
    spec: spec('qt1')
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(queryCount, 1);
  assert.equal(first.replayed, false);

  const second = await program.quickTake('event-a', {
    type: 'quick-take',
    requestId: 'dup-qt',
    spec: spec('qt1')
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(
    queryCount,
    1,
    'no second stats query ran for the replayed requestId'
  );
  assert.equal(second.replayed, true);
  assert.deepEqual(second.state, first.state);
});

/* -------------------------------------------------------------------- */
/* transitions                                                           */
/* -------------------------------------------------------------------- */

test('transitions: take onto black enters only, same-mode take crossfades, cross-mode take exits/gaps/enters (gapMs===250), clear is exit-only', async () => {
  const { program, coordinator } = setup();

  // Take onto black: no outgoing program.
  const t1 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1', { mode: 'fullscreen' })
  );
  const ack1 = await program.take('event-a', {
    type: 'take',
    requestId: 'take1',
    target: t1
  });
  assert.equal(ack1.ok, true);
  if (!ack1.ok) return;
  assert.equal(ack1.state.transition?.crossfadeMs, 0);
  assert.equal(ack1.state.transition?.exitMs, 0);
  assert.ok((ack1.state.transition?.enterMs ?? 0) > 0);
  assert.equal(ack1.state.transition?.gapMs, 250);

  // Same-mode replacement: crossfade only.
  const t2 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue2',
    spec('g2', { mode: 'fullscreen' })
  );
  const ack2 = await program.take('event-a', {
    type: 'take',
    requestId: 'take2',
    target: t2
  });
  assert.equal(ack2.ok, true);
  if (!ack2.ok) return;
  assert.ok((ack2.state.transition?.crossfadeMs ?? 0) > 0);
  assert.equal(ack2.state.transition?.exitMs, 0);
  assert.equal(ack2.state.transition?.enterMs, 0);
  assert.equal(ack2.state.transition?.gapMs, 250);

  // Cross-mode replacement: exit outgoing, fixed gap, enter incoming.
  const t3 = await readyCueTarget(
    coordinator,
    'event-a',
    'cue3',
    spec('g3', { mode: 'drawer-left' })
  );
  const ack3 = await program.take('event-a', {
    type: 'take',
    requestId: 'take3',
    target: t3
  });
  assert.equal(ack3.ok, true);
  if (!ack3.ok) return;
  assert.equal(ack3.state.transition?.crossfadeMs, 0);
  assert.ok((ack3.state.transition?.exitMs ?? 0) > 0);
  assert.ok((ack3.state.transition?.enterMs ?? 0) > 0);
  assert.equal(ack3.state.transition?.gapMs, 250);

  // Clear: exit only, nothing entering.
  const clearAck = await program.clear('event-a', {
    type: 'clear',
    requestId: 'clear1'
  });
  assert.equal(clearAck.ok, true);
  if (!clearAck.ok) return;
  assert.equal(clearAck.state.transition?.crossfadeMs, 0);
  assert.ok((clearAck.state.transition?.exitMs ?? 0) > 0);
  assert.equal(clearAck.state.transition?.enterMs, 0);
  assert.equal(clearAck.state.transition?.gapMs, 250);
});

/* -------------------------------------------------------------------- */
/* command routing                                                       */
/* -------------------------------------------------------------------- */

test('handle: dispatches take/clear/quick-take and throws for anything else', async () => {
  const { program, coordinator } = setup();
  const target = await readyCueTarget(
    coordinator,
    'event-a',
    'cue1',
    spec('g1')
  );
  const takeAck = await program.handle('event-a', {
    type: 'take',
    requestId: 'take1',
    target
  });
  assert.equal(takeAck.ok, true);
  const clearAck = await program.handle('event-a', {
    type: 'clear',
    requestId: 'clear1'
  });
  assert.equal(clearAck.ok, true);

  assert.throws(() =>
    program.handle('event-a', { type: 'advance', requestId: 'adv1' })
  );
});
