import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyPlaybackState,
  playbackStateZod,
  preparedGraphicZod,
  presentationFrameZod,
  type GraphicSpec,
  type PlaybackState,
  type Rundown,
  type VersionedTimeline
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
  PlaybackNavigation,
  type LoadEntities,
  type PlaybackNavigationRepository,
  type PlaybackNavigationStats
} from '../graphics/PlaybackNavigation.js';

/**
 * Every test in this file drives `PlaybackNavigation` by direct function
 * call against in-memory fakes: no Fastify instance is created anywhere
 * below, and no producer socket is ever connected. That is deliberate - it
 * is the property this module exists to guarantee (a Companion button with
 * nothing else running must be able to drive the broadcast).
 */

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

function timeline(
  timelineId: string,
  items: GraphicSpec[],
  overrides: Partial<VersionedTimeline> = {}
): VersionedTimeline {
  return {
    schemaVersion: 2,
    revision: 0,
    timelineId,
    eventKey: 'event-a',
    name: timelineId,
    items,
    updatedAtUtc: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides
  };
}

function rundown(
  rundownId: string,
  entries: Rundown['entries'],
  overrides: Partial<Rundown> = {}
): Rundown {
  return {
    schemaVersion: 2,
    revision: 0,
    rundownId,
    eventKey: 'event-a',
    name: rundownId,
    entries,
    updatedAtUtc: new Date('2026-01-01T00:00:00.000Z').toISOString(),
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

/** Default fake `prepareFrame`: deterministic, ignores the actual stat payload. Individual tests override it where the frame's content is the thing under test. */
const fakePrepareFrame: typeof prepareGraphicFrame = (result, s, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  return fakeFrame(s, ctx.asOfUtc);
};

/** Not a real repository: a NOT_FOUND lookup throws an object shaped like `GraphicsRepositoryError` (a `.code` property), which is exactly what production code throws too. */
class FakeRepository implements PlaybackNavigationRepository {
  readonly timelines = new Map<string, VersionedTimeline>();
  readonly rundowns = new Map<string, Rundown>();
  async loadTimeline(eventKey: string, id: string): Promise<VersionedTimeline> {
    const found = this.timelines.get(id);
    if (!found || found.eventKey !== eventKey)
      throw Object.assign(new Error(`Timeline ${id} does not exist`), {
        code: 'NOT_FOUND'
      });
    return clone(found);
  }
  async loadRundown(eventKey: string, id: string): Promise<Rundown> {
    const found = this.rundowns.get(id);
    if (!found || found.eventKey !== eventKey)
      throw Object.assign(new Error(`Rundown ${id} does not exist`), {
        code: 'NOT_FOUND'
      });
    return clone(found);
  }
}

class FakeStats implements PlaybackNavigationStats {
  catalogueEntries: { slug: string; catalogueId: string }[] = [
    { slug: 'score', catalogueId: 'CAT-SCORE' }
  ];
  queryCount = 0;
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
      calculatedAsOfUtc: new Date('2026-01-01T00:00:00.000Z').toISOString()
    });
  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return this.catalogueEntries;
  }
  async query(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }> {
    this.queryCount++;
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
    loadEntities?: LoadEntities;
    prepareFrame?: typeof prepareGraphicFrame;
  } = {}
) {
  const storage = new MemoryStorage();
  const coordinator = new PlaybackCoordinator({ storage });
  const repository = new FakeRepository();
  const stats = new FakeStats();
  let counter = 0;
  const nav = new PlaybackNavigation({
    coordinator,
    repository,
    stats,
    loadEntities: overrides.loadEntities ?? (async () => ({})),
    prepareFrame: overrides.prepareFrame ?? fakePrepareFrame,
    now: () => new Date('2026-01-01T00:00:00.000Z').toISOString(),
    newId: () => `id-${++counter}`
  });
  return { nav, coordinator, repository, stats, storage };
}

/** Seeds a durable program directly through storage, bypassing PlaybackNavigation entirely, so tests can prove navigation never writes it. */
async function seedProgram(
  storage: MemoryStorage,
  eventKey: string
): Promise<PlaybackState> {
  const atUtc = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const seedSpec = spec('seed-program');
  const graphic = preparedGraphicZod.parse({
    target: {
      targetId: 'seed-target',
      targetRevision: 1,
      requestId: 'seed',
      snapshotId: null,
      index: null
    },
    spec: seedSpec,
    frame: fakeFrame(seedSpec, atUtc),
    preparedAtUtc: atUtc
  });
  const state = playbackStateZod.parse({
    schemaVersion: 2,
    eventKey,
    revision: 1,
    loaded: null,
    cue: { status: 'empty' },
    program: { revision: 1, graphic, takenAtUtc: atUtc },
    stagedUpdate: { status: 'empty' },
    transition: null,
    lastCommandId: 'seed',
    updatedAtUtc: atUtc
  });
  await storage.savePlayback(eventKey, state, 0);
  return state;
}

test('load: headlessly builds a snapshot (no Fastify, no producer socket) and reaches a ready cue with program untouched', async () => {
  const { nav, repository } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));

  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.loaded?.index, 0);
  assert.equal(ack.state.loaded?.items.length, 2);
  assert.equal(ack.state.cue.status, 'ready');
  assert.equal(ack.state.program, null);
});

test('load: an empty timeline is rejected as INVALID_INPUT and leaves loaded/cue/program exactly as they were', async () => {
  const { nav, repository, coordinator } = setup();
  repository.timelines.set('empty', timeline('empty', []));
  const before = await coordinator.getState('event-a');

  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 'empty'
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'INVALID_INPUT');

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});

test('load: a missing timeline is rejected as NOT_FOUND and nothing is replaced', async () => {
  const { nav, coordinator } = setup();
  const before = await coordinator.getState('event-a');

  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 'ghost'
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_FOUND');

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});

test('load: reloading the SAME timeline with no values (the live-editor Save path) reuses the values the transport already had, instead of dropping template bindings', async () => {
  const { nav, repository } = setup();
  const templated = spec('templated', {
    selectors: {},
    bindings: { teamKey: 'team' }
  });
  repository.timelines.set('t1', timeline('t1', [templated]));

  const first = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1',
    values: { team: 1114 }
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.state.cue.status, 'ready');
  if (first.state.cue.status === 'ready')
    assert.equal(first.state.cue.graphic.spec.selectors.teamKey, 1114);
  assert.deepEqual(first.state.loaded?.values, { team: 1114 });

  // Simulate the producer editing the timeline (e.g. changing an item's mode)
  // and hitting Save: the timeline definition changes underneath, but the
  // reload command that follows - exactly like `handleSaveTimeline` sends -
  // carries no `values` of its own.
  repository.timelines.set(
    't1',
    timeline(
      't1',
      [
        spec('templated', {
          selectors: {},
          bindings: { teamKey: 'team' },
          mode: 'lower-third'
        })
      ],
      { revision: 1 }
    )
  );
  const reloaded = await nav.load('event-a', {
    type: 'load',
    requestId: 'load2',
    timelineId: 't1'
  });
  assert.equal(reloaded.ok, true);
  if (!reloaded.ok) return;
  assert.equal(reloaded.state.cue.status, 'ready');
  if (reloaded.state.cue.status === 'ready') {
    assert.equal(reloaded.state.cue.graphic.spec.selectors.teamKey, 1114);
    assert.equal(reloaded.state.cue.graphic.spec.mode, 'lower-third');
  }
  assert.deepEqual(reloaded.state.loaded?.values, { team: 1114 });
});

test("load: loading a DIFFERENT timeline with no values never inherits the previous timeline's values", async () => {
  const { nav, repository } = setup();
  const templated = spec('templated', {
    selectors: {},
    bindings: { teamKey: 'team' }
  });
  repository.timelines.set('t1', timeline('t1', [templated]));
  repository.timelines.set(
    't2',
    timeline('t2', [
      spec('templated2', { selectors: {}, bindings: { teamKey: 'team' } })
    ])
  );

  await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1',
    values: { team: 1114 }
  });
  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load2',
    timelineId: 't2'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  if (ack.state.cue.status === 'failed')
    assert.equal(ack.state.cue.spec.selectors.teamKey, undefined);
  assert.equal(ack.state.loaded?.values, undefined);
});

test('load-rundown: the flat item order matches rundown order and each item records its entryId', async () => {
  const { nav, repository } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  repository.timelines.set('t2', timeline('t2', [spec('b1')]));
  repository.rundowns.set(
    'r1',
    rundown('r1', [
      { entryId: 'e1', timelineId: 't1' },
      { entryId: 'e2', timelineId: 't2' }
    ])
  );

  const ack = await nav.loadRundown('event-a', {
    type: 'load-rundown',
    requestId: 'load1',
    rundownId: 'r1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  const { items } = ack.state.loaded!;
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => i.entryId),
    ['e1', 'e1', 'e2']
  );
  assert.deepEqual(
    items.map((i) => i.spec.id),
    ['a1', 'a2', 'b1']
  );
});

test("advance: past the last item of one rundown entry rolls the cue into the next entry's first item; program is untouched (headless: no producer socket connected)", async () => {
  const { nav, repository, storage } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1')]));
  repository.timelines.set('t2', timeline('t2', [spec('b1'), spec('b2')]));
  repository.rundowns.set(
    'r1',
    rundown('r1', [
      { entryId: 'e1', timelineId: 't1' },
      { entryId: 'e2', timelineId: 't2' }
    ])
  );
  const seeded = await seedProgram(storage, 'event-a');

  const loadAck = await nav.loadRundown('event-a', {
    type: 'load-rundown',
    requestId: 'load1',
    rundownId: 'r1'
  });
  assert.equal(loadAck.ok, true);

  const advAck = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'adv1'
  });
  assert.equal(advAck.ok, true);
  if (!advAck.ok) return;
  assert.equal(advAck.state.loaded?.index, 1);
  assert.equal(advAck.state.cue.status, 'ready');
  if (advAck.state.cue.status === 'ready')
    assert.equal(advAck.state.cue.graphic.spec.id, 'b1');
  // Nothing goes on air just because the cue rolled to a new entry - the next press performs the take.
  assert.deepEqual(advAck.state.program, seeded.program);
});

test('advance: at the very last item of the last entry clamps - success, state unchanged, no error', async () => {
  const { nav, repository, coordinator } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  const first = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'adv1'
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.state.loaded?.index, 1);

  const before = await coordinator.getState('event-a');
  const clamped = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'adv2'
  });
  assert.equal(clamped.ok, true);
  if (!clamped.ok) return;
  assert.deepEqual(clamped.state, before);
});

test("previous: at item 0 of the second entry rolls back into the first entry's last item", async () => {
  const { nav, repository } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  repository.timelines.set('t2', timeline('t2', [spec('b1')]));
  repository.rundowns.set(
    'r1',
    rundown('r1', [
      { entryId: 'e1', timelineId: 't1' },
      { entryId: 'e2', timelineId: 't2' }
    ])
  );
  await nav.loadRundown('event-a', {
    type: 'load-rundown',
    requestId: 'load1',
    rundownId: 'r1'
  });
  const goAck = await nav.go('event-a', {
    type: 'go',
    requestId: 'go1',
    index: 2
  });
  assert.equal(goAck.ok, true);

  const prevAck = await nav.previous('event-a', {
    type: 'previous',
    requestId: 'prev1'
  });
  assert.equal(prevAck.ok, true);
  if (!prevAck.ok) return;
  assert.equal(prevAck.state.loaded?.index, 1);
  if (prevAck.state.cue.status === 'ready')
    assert.equal(prevAck.state.cue.graphic.spec.id, 'a2');
});

test('previous: at item 0 of the first entry clamps - success, state unchanged', async () => {
  const { nav, repository, coordinator } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });

  const before = await coordinator.getState('event-a');
  const prevAck = await nav.previous('event-a', {
    type: 'previous',
    requestId: 'prev1'
  });
  assert.equal(prevAck.ok, true);
  if (!prevAck.ok) return;
  assert.deepEqual(prevAck.state, before);
});

test('go: a negative, non-integer, or out-of-range index is INVALID_INPUT every time and never changes state', async () => {
  const { nav, repository, coordinator } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  const before = await coordinator.getState('event-a');

  for (const [label, index] of [
    ['negative', -1],
    ['non-integer', 1.5],
    ['out-of-range', 99]
  ] as const) {
    const ack = await nav.go('event-a', {
      type: 'go',
      requestId: `go-${label}`,
      index
    });
    assert.equal(ack.ok, false, label);
    if (ack.ok) continue;
    assert.equal(ack.error.code, 'INVALID_INPUT', label);
  }

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});

test('advance: replaying the same requestId returns the original acknowledgment and runs no second stats query', async () => {
  const { nav, repository, stats } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  const countAfterLoad = stats.queryCount;

  const first = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'dup-adv'
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(stats.queryCount, countAfterLoad + 1);

  const second = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'dup-adv'
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(
    stats.queryCount,
    countAfterLoad + 1,
    'no second stats query ran for the replayed requestId'
  );
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.deepEqual(second.state, first.state);
});

test('load: editing the saved timeline afterward does not change what an already-loaded snapshot navigates (immutability)', async () => {
  const { nav, repository } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1'), spec('a2')]));
  const loadAck = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  assert.equal(loadAck.ok, true);

  // Simulate an edit-and-save of the timeline through the repository, as a producer editing the timeline would.
  repository.timelines.set(
    't1',
    timeline('t1', [spec('a1-EDITED'), spec('a2-EDITED'), spec('a3-EDITED')], {
      revision: 1
    })
  );

  const advAck = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'adv1'
  });
  assert.equal(advAck.ok, true);
  if (!advAck.ok) return;
  assert.equal(advAck.state.loaded?.items.length, 2);
  if (advAck.state.cue.status === 'ready')
    assert.equal(advAck.state.cue.graphic.spec.id, 'a2');
});

test('load-rundown: template bindings resolve per rundown entry, so two entries sharing a timeline query different concrete keys', async () => {
  const { nav, repository, stats } = setup();
  const templated = spec('templated', {
    selectors: {},
    bindings: { teamKey: 'team' }
  });
  repository.timelines.set('t1', timeline('t1', [templated]));
  repository.rundowns.set(
    'r1',
    rundown('r1', [
      { entryId: 'e1', timelineId: 't1', values: { team: 1114 } },
      { entryId: 'e2', timelineId: 't1', values: { team: 2471 } }
    ])
  );
  const seenSelectors: unknown[] = [];
  stats.queryImpl = async (_eventKey, input) => {
    seenSelectors.push((input as { selectors: unknown }).selectors);
    return {
      result: {
        status: 'ok',
        data: { value: 1 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: new Date().toISOString()
    };
  };

  const loadAck = await nav.loadRundown('event-a', {
    type: 'load-rundown',
    requestId: 'load1',
    rundownId: 'r1'
  });
  assert.equal(loadAck.ok, true);
  const goAck = await nav.go('event-a', {
    type: 'go',
    requestId: 'go1',
    index: 1
  });
  assert.equal(goAck.ok, true);

  assert.deepEqual(seenSelectors[0], { teamKey: 1114 });
  assert.deepEqual(seenSelectors[1], { teamKey: 2471 });
});

test("load-rundown: a rundown entry missing a bound variable's value ends the cue failed, with an absent selector, and never calls the stats service", async () => {
  const { nav, repository, stats } = setup();
  const templated = spec('templated', {
    selectors: {},
    bindings: { teamKey: 'team' }
  });
  repository.timelines.set('t1', timeline('t1', [templated]));
  repository.rundowns.set(
    'r1',
    rundown('r1', [{ entryId: 'e1', timelineId: 't1', values: {} }])
  );

  const ack = await nav.loadRundown('event-a', {
    type: 'load-rundown',
    requestId: 'load1',
    rundownId: 'r1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  if (ack.state.cue.status === 'failed') {
    assert.equal(ack.state.cue.error.code, 'INVALID_INPUT');
    assert.equal(ack.state.cue.spec.selectors.teamKey, undefined);
  }
  assert.equal(stats.queryCount, 0);
});

test('prepare-cue: a match is selected by (tournamentKey, id) together, never by id alone', async () => {
  const wrongTournamentName = 'Qual Match 1 (wrong tournament)';
  const rightTournamentName = 'Playoff Match 1 (right tournament)';
  const matches = [
    { tournamentKey: 'qual', id: 1, name: wrongTournamentName },
    { tournamentKey: 'playoff', id: 1, name: rightTournamentName }
  ];
  const prepareFrame: typeof prepareGraphicFrame = (result, s, ctx) => {
    if (result.status !== 'ok') throw new Error('unexpected non-ok result');
    const tournamentKey = s.params.tournamentKey as string;
    const matchId = s.selectors.matchId as number;
    const match = ctx.matches?.find(
      (m) => m.tournamentKey === tournamentKey && m.id === matchId
    );
    return presentationFrameZod.parse({
      schemaVersion: 2,
      kind: 'stat-tile',
      title: s.title,
      asOfUtc: ctx.asOfUtc,
      quality: 'complete',
      warnings: [],
      series: [],
      data: {
        kind: 'stat-tile',
        values: [
          {
            id: 'match',
            label: match?.name ?? 'unknown',
            value: 1,
            format: { style: 'number', scale: 1 }
          }
        ]
      }
    });
  };
  const { nav, repository } = setup({
    loadEntities: async () => ({ matches }),
    prepareFrame
  });

  const s = spec('match-spec', {
    selectors: { matchId: 1 },
    params: { tournamentKey: 'playoff' }
  });
  repository.timelines.set('t1', timeline('t1', [s]));

  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'ready');
  if (ack.state.cue.status !== 'ready') return;
  const { values } = ack.state.cue.graphic.frame.data as {
    kind: 'stat-tile';
    values: { label: string }[];
  };
  assert.equal(values[0].label, rightTournamentName);
});

test('prepare-cue: a non-ok stats result ends the cue failed with its reason, nothing throws, and program is untouched', async () => {
  const { nav, repository, stats, storage } = setup();
  repository.timelines.set('t1', timeline('t1', [spec('a1')]));
  const seeded = await seedProgram(storage, 'event-a');
  stats.queryImpl = async () => ({
    result: {
      status: 'insufficient_data',
      reason: 'No eligible observations',
      warnings: []
    },
    calculatedAsOfUtc: new Date('2026-01-01T00:00:00.000Z').toISOString()
  });

  const ack = await nav.load('event-a', {
    type: 'load',
    requestId: 'load1',
    timelineId: 't1'
  });
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  assert.equal(ack.state.cue.status, 'failed');
  if (ack.state.cue.status === 'failed') {
    assert.equal(ack.state.cue.error.code, 'CALCULATION_FAILED');
    assert.equal(ack.state.cue.error.message, 'No eligible observations');
  }
  assert.deepEqual(ack.state.program, seeded.program);
});

test('advance: with nothing loaded returns NOT_READY and leaves state unchanged (headless restart with no prior load)', async () => {
  const { nav, coordinator } = setup();
  const before = await coordinator.getState('event-a');

  const ack = await nav.advance('event-a', {
    type: 'advance',
    requestId: 'adv1'
  });
  assert.equal(ack.ok, false);
  if (ack.ok) return;
  assert.equal(ack.error.code, 'NOT_READY');

  const after = await coordinator.getState('event-a');
  assert.deepEqual(after, before);
});
