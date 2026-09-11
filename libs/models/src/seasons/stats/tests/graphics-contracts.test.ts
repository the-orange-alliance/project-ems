import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyPlaybackState,
  fromLegacyPlaybackState,
  graphicSpecZod,
  graphicsTargetZod,
  migrateTimeline,
  playbackCommandZod,
  playbackStateZod,
  preparedGraphicZod,
  presentationFrameZod,
  rundownZod,
  snapshotPreparedGraphic,
  vizFrameZod,
  type GraphicSpec,
  type PresentationFrame
} from '../../../base/Graphics.js';

const atUtc = '2026-09-09T12:00:00.000Z';
const spec: GraphicSpec = {
  id: 'tile-1',
  stat: 'A1',
  title: 'Score',
  kind: 'stat-tile',
  mode: 'lower-third',
  selectors: {},
  filters: {},
  params: {},
  options: {}
};
const frame: PresentationFrame = {
  schemaVersion: 2,
  kind: 'stat-tile',
  title: 'Score',
  asOfUtc: atUtc,
  quality: 'complete',
  warnings: [],
  series: [],
  data: {
    kind: 'stat-tile',
    values: [
      {
        id: 'score',
        label: 'Score',
        value: 0,
        format: { style: 'number', scale: 1, precision: 0 }
      }
    ]
  }
};
const target = {
  targetId: 'cue-1',
  targetRevision: 1,
  requestId: 'request-1',
  snapshotId: null,
  index: null
};
const graphic = { target, spec, frame, preparedAtUtc: atUtc };

test('legacy frame bridge remains parseable but new preparation requires typed semantic data', () => {
  const legacy = { ...frame, schemaVersion: undefined, data: undefined };
  assert.equal(vizFrameZod.safeParse(legacy).success, true);
  assert.equal(presentationFrameZod.safeParse(legacy).success, false);
  assert.equal(preparedGraphicZod.safeParse(graphic).success, true);
  assert.equal(
    presentationFrameZod.safeParse({ ...frame, kind: 'bar' }).success,
    false
  );
  assert.equal(
    preparedGraphicZod.safeParse({ ...graphic, spec: { ...spec, kind: 'bar' } })
      .success,
    false
  );
});

test('options, unresolved bindings, unsupported lower thirds and unsafe IDs fail preparation', () => {
  for (const options of [
    { limit: 0 },
    { limit: 1.5 },
    { precision: -1 },
    { precision: 13 }
  ]) {
    assert.equal(graphicSpecZod.safeParse({ ...spec, options }).success, false);
  }
  for (const patch of [
    { id: '../unsafe' },
    { kind: 'line' },
    { bindings: { teamKey: 'team' } }
  ]) {
    assert.equal(
      preparedGraphicZod.safeParse({ ...graphic, spec: { ...spec, ...patch } })
        .success,
      false
    );
  }
});

test('timeline migration preserves legacy IDs and new template data, and never discards corrupt input', () => {
  const timeline = {
    timelineId: 'legacy-timeline_1',
    eventKey: 'event-1',
    name: 'Team spotlight',
    variables: [{ name: 'team', kind: 'team' }],
    items: [{ ...spec, bindings: { teamKey: 'team' } }],
    updatedAtUtc: atUtc
  };
  const migrated = migrateTimeline(timeline);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.revision, 0);
  assert.deepEqual(migrated.items, timeline.items);
  assert.deepEqual(migrated.variables, timeline.variables);
  assert.deepEqual(migrateTimeline({ ...migrated, revision: 4 }).revision, 4);
  assert.throws(() => migrateTimeline({ ...timeline, items: 'corrupt' }));
  assert.throws(() => migrateTimeline({ ...timeline, schemaVersion: 99 }));
});

test('rundowns preserve per-entry template values and require unique entry identities', () => {
  const rundown = {
    schemaVersion: 2,
    revision: 0,
    rundownId: 'r-1',
    eventKey: 'event-1',
    name: 'Show',
    entries: [
      {
        entryId: 'entry-1',
        timelineId: 't-1',
        values: { team: 7 },
        note: 'Team seven'
      }
    ],
    updatedAtUtc: atUtc
  };
  assert.deepEqual(rundownZod.parse(rundown).entries[0].values, { team: 7 });
  assert.equal(
    rundownZod.safeParse({
      ...rundown,
      entries: [...rundown.entries, ...rundown.entries]
    }).success,
    false
  );
});

test('command identity, revision and zero-based navigation are validated', () => {
  assert.equal(
    playbackCommandZod.safeParse({ type: 'go', requestId: 'go-1', index: 0 })
      .success,
    true
  );
  for (const input of [
    { type: 'clear' },
    { type: 'take', requestId: 'take-1' },
    { type: 'go', requestId: 'go-1', index: -1 },
    { type: 'clear', requestId: 'clear-1', expectedRevision: 0.5 }
  ]) {
    assert.equal(playbackCommandZod.safeParse(input).success, false);
  }
  assert.equal(
    graphicsTargetZod.safeParse({ ...target, index: 0 }).success,
    false
  );
});

test('program and cue are independent snapshots and persisted clear is explicit', () => {
  const state = createEmptyPlaybackState('event-1', atUtc);
  state.revision = 1;
  state.cue = { status: 'ready', graphic };
  state.program = {
    revision: 1,
    graphic: snapshotPreparedGraphic(graphic),
    takenAtUtc: atUtc
  };
  const parsed = playbackStateZod.parse(state);
  if (parsed.cue.status !== 'ready') throw new Error('Expected ready cue');
  parsed.cue.graphic.spec.title = 'New cue title';
  assert.equal(parsed.program?.graphic.spec.title, 'Score');
  parsed.program = null;
  assert.equal(
    playbackStateZod.parse(JSON.parse(JSON.stringify(parsed))).program,
    null
  );
  assert.equal(
    playbackStateZod.safeParse({
      ...state,
      revision: Number.MAX_SAFE_INTEGER + 1
    }).success,
    false
  );
});

test('loaded timelines cannot leak across event scope', () => {
  const timeline = migrateTimeline({
    timelineId: 't-1',
    eventKey: 'other-event',
    name: 'Other',
    items: [spec],
    updatedAtUtc: atUtc
  });
  const state = createEmptyPlaybackState('event-1', atUtc);
  state.loaded = {
    snapshotId: 's-1',
    source: { kind: 'timeline', timelineId: 't-1', revision: 0 },
    timelines: [timeline],
    items: [{ timelineId: 't-1', timelineRevision: 0, itemIndex: 0, spec }],
    index: 0,
    loadedAtUtc: atUtc
  };
  assert.equal(playbackStateZod.safeParse(state).success, false);
});

test('legacy adoption preserves exact program and refuses missing or untyped on-air frames', () => {
  const legacy = {
    timelineId: 't-1',
    index: 0,
    spec,
    frame,
    onAir: true,
    generation: 5,
    queueEntryId: 'e-1',
    armed: true
  };
  const state = fromLegacyPlaybackState('event-1', legacy, atUtc);
  assert.deepEqual(state.program?.graphic.frame, frame);
  assert.equal(state.revision, 5);
  assert.equal(
    fromLegacyPlaybackState(
      'event-1',
      { ...legacy, onAir: false, frame: null },
      atUtc
    ).program,
    null
  );
  assert.throws(() =>
    fromLegacyPlaybackState('event-1', { ...legacy, frame: null }, atUtc)
  );
  assert.throws(() =>
    fromLegacyPlaybackState(
      'event-1',
      { ...legacy, frame: { ...frame, data: undefined } },
      atUtc
    )
  );
});

test('semantic frames validate chronology, shared domain, authoritative rank, and empty reasons', () => {
  const measure = {
    id: 'score',
    label: 'Score',
    format: { style: 'number', scale: 1 }
  };
  const line = {
    ...frame,
    kind: 'line',
    data: {
      kind: 'line',
      xType: 'number',
      series: [
        {
          id: 'team-1',
          label: 'Team 1',
          measure,
          interpolation: 'step',
          points: [
            { x: 2, value: 1 },
            { x: 1, value: 0 }
          ]
        }
      ]
    }
  };
  assert.equal(presentationFrameZod.safeParse(line).success, false);
  const bar = {
    ...frame,
    kind: 'bar',
    data: {
      kind: 'bar',
      entities: [{ id: 'team-1', label: 'Team' }],
      series: [
        {
          id: 's-1',
          label: 'Score',
          measure,
          points: [{ entityId: 'unknown', value: 0 }]
        }
      ]
    }
  };
  assert.equal(presentationFrameZod.safeParse(bar).success, false);
  const ranking = {
    ...frame,
    kind: 'ranking-table',
    data: {
      kind: 'ranking-table',
      columns: [measure],
      rows: [{ id: 'team-7', label: 'Team 7', rank: 7, cells: { score: 0 } }]
    }
  };
  assert.equal(presentationFrameZod.safeParse(ranking).success, true);
  assert.equal(
    presentationFrameZod.safeParse({
      ...ranking,
      data: {
        ...ranking.data,
        rows: [{ id: 'team-7', label: 'Team 7', cells: { score: 0 } }]
      }
    }).success,
    false
  );
  const empty = { ...frame, data: { kind: 'stat-tile', values: [] } };
  assert.equal(presentationFrameZod.safeParse(empty).success, false);
  assert.equal(
    presentationFrameZod.safeParse({
      ...empty,
      emptyReason: 'No eligible matches'
    }).success,
    true
  );
});
