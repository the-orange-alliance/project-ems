/**
 * Fixture tests for the FGC2026 "M" (audit-trail / replay-curve) semantic
 * presentation registrations (`../presentation/fgc2026-m.ts`).
 *
 * Placed under seasons/stats/tests (not presentation/) because the package
 * `test` script globs only `build/seasons/stats/tests/*.test.js` — see
 * libs/models/package.json. A file under presentation/ would compile but
 * never run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fgc2026MRegistrations } from '../presentation/fgc2026-m.js';
import {
  SemanticPreparationError,
  type SemanticRegistration
} from '../presentation/semantic-helpers.js';
import type { AdaptContext } from '../presentation/adapt-context.js';
import {
  presentationFrameZod,
  type GraphicKind,
  type GraphicSpec,
  type PresentationData
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';

const golden: Record<string, StatResult> = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);

/** Every M-family golden fixture is a real `status: 'ok'` result; this
 * extracts its `data` for building typed assertions in the tests below. */
function goldenData(id: string): unknown {
  const result = golden[id];
  if (result.status !== 'ok')
    throw new Error(`${id}: golden fixture is not ok`);
  return result.data;
}

function asLine(
  data: PresentationData
): Extract<PresentationData, { kind: 'line' }> {
  if (data.kind !== 'line')
    throw new Error(`expected line data, got ${data.kind}`);
  return data;
}

function asBar(
  data: PresentationData
): Extract<PresentationData, { kind: 'bar' | 'grouped-bar' }> {
  if (data.kind !== 'bar' && data.kind !== 'grouped-bar')
    throw new Error(`expected bar/grouped-bar data, got ${data.kind}`);
  return data;
}

function asTable(
  data: PresentationData
): Extract<PresentationData, { kind: 'table' | 'ranking-table' }> {
  if (data.kind !== 'table' && data.kind !== 'ranking-table')
    throw new Error(`expected table data, got ${data.kind}`);
  return data;
}

const registrationsById = new Map<string, SemanticRegistration>(
  fgc2026MRegistrations.map((registration) => [
    registration.catalogueId,
    registration
  ])
);

const teams = [
  { teamKey: 1, teamNumber: '1', teamNameShort: 'Alpha' },
  { teamKey: 2, teamNumber: '2', teamNameShort: 'Beta' }
];
const matches = ['q', 'r', 'p', 'f'].flatMap((tournamentKey) =>
  [1, 2, 3, 4].map((id) => ({
    tournamentKey,
    id,
    name: `${tournamentKey.toUpperCase()}${id}`
  }))
);

function ctx(): AdaptContext {
  return {
    catalogueId: 'test',
    asOfUtc: '2026-09-01T15:00:00.000Z',
    teams,
    matches
  };
}

function spec(
  id: string,
  kind: GraphicKind,
  params: Record<string, unknown> = {}
): GraphicSpec {
  return {
    id: `test-${id}`,
    title: `Test ${id}`,
    stat: id,
    selectors: {},
    filters: {},
    params,
    kind,
    mode: 'fullscreen',
    options: {}
  } as GraphicSpec;
}

function ok(
  data: unknown,
  warnings: string[] = []
): Extract<StatResult, { status: 'ok' }> {
  return {
    status: 'ok',
    data,
    quality: warnings.length ? 'best_effort' : 'complete',
    warnings
  } as Extract<StatResult, { status: 'ok' }>;
}

const ALL_M_IDS = Array.from({ length: 27 }, (_, i) => `M${i + 1}`);

test('fgc2026MRegistrations covers exactly M1..M27, each once, all under the fgc_2026 season', () => {
  assert.equal(fgc2026MRegistrations.length, 27, 'exactly 27 registrations');
  const ids = fgc2026MRegistrations.map((r) => r.catalogueId);
  assert.deepEqual(
    [...ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))),
    ALL_M_IDS
  );
  assert.equal(new Set(ids).size, 27, 'catalogue ids are unique');
  for (const registration of fgc2026MRegistrations) {
    assert.equal(
      registration.seasonKey,
      'fgc_2026',
      `${registration.catalogueId}: seasonKey`
    );
    assert.ok(
      registration.metadata.supportedKinds.includes(
        registration.metadata.defaultKind
      ),
      `${registration.catalogueId}: defaultKind must be in supportedKinds`
    );
    assert.ok(
      registration.manifest.assertions.length > 0,
      `${registration.catalogueId}: manifest must document assertions`
    );
    assert.equal(registration.manifest.catalogueId, registration.catalogueId);
  }
});

test('every M id produces a schema-valid, non-empty semantic frame from its real golden fixture', () => {
  for (const id of ALL_M_IDS) {
    const registration = registrationsById.get(id)!;
    const params = id === 'M15' ? { atUtc: '2026-09-01T12:00:10.000Z' } : {};
    const graphicSpec = spec(id, registration.metadata.defaultKind, params);
    let frame;
    assert.doesNotThrow(() => {
      frame = registration.adapt(golden[id], graphicSpec, ctx());
    }, `${id}: adapt() threw unexpectedly`);
    const parsed = presentationFrameZod.safeParse(frame);
    assert.ok(
      parsed.success,
      `${id}: invalid frame — ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`
    );
    assert.equal(
      frame!.data!.kind,
      registration.metadata.defaultKind,
      `${id}: data.kind must match defaultKind`
    );
    assert.equal(
      frame!.emptyReason,
      undefined,
      `${id}: the real golden fixture is populated and must not report emptyReason`
    );
  }
});

test('adapt() is deterministic for every M id on its golden fixture', () => {
  for (const id of ALL_M_IDS) {
    const registration = registrationsById.get(id)!;
    const params = id === 'M15' ? { atUtc: '2026-09-01T12:00:10.000Z' } : {};
    const graphicSpec = spec(id, registration.metadata.defaultKind, params);
    const frame1 = registration.adapt(golden[id], graphicSpec, ctx());
    const frame2 = registration.adapt(golden[id], graphicSpec, ctx());
    assert.deepEqual(frame2, frame1, `${id}: adapt() must be deterministic`);
  }
});

test('a non-ok StatResult is a source failure: adapt() throws via requireOkResult, never a fabricated empty frame', () => {
  const failure: StatResult = {
    status: 'unavailable',
    reason: 'No captured action events',
    warnings: []
  };
  for (const id of ['M1', 'M8', 'M9', 'M16', 'M22']) {
    const registration = registrationsById.get(id)!;
    const params = id === 'M15' ? { atUtc: '2026-09-01T12:00:00.000Z' } : {};
    assert.throws(
      () =>
        registration.adapt(
          failure,
          spec(id, registration.metadata.defaultKind, params),
          ctx()
        ),
      /No captured action events/,
      `${id}: must surface the source failure reason, not swallow it`
    );
  }
});

// ---------------------------------------------------------------------------
// M1-M4/M6/M7/M18-M20: tournament-qualified match identity
// ---------------------------------------------------------------------------

test('M1: repeated matchIds across distinct tournaments produce distinct, tournament-qualified entities', () => {
  const registration = registrationsById.get('M1')!;
  const rows = goldenData('M1') as { tournamentKey: string; matchId: number }[];
  assert.ok(rows.some((r) => r.matchId === 1 && r.tournamentKey === 'q'));
  assert.ok(rows.some((r) => r.matchId === 1 && r.tournamentKey === 'f'));
  const frame = registration.adapt(golden.M1, spec('M1', 'bar'), ctx());
  const data = asBar(frame.data!);
  assert.equal(
    data.entities.length,
    rows.length,
    'one entity per source row, none merged'
  );
  assert.equal(
    new Set(data.entities.map((e) => e.id)).size,
    rows.length,
    'entity ids are all unique'
  );
  assert.equal(data.series[0].points.length, rows.length);
  // Every golden M1 row carries value 3 (a measured count) — must survive as 3, not null or 0-coerced-from-something-else.
  assert.ok(data.series[0].points.every((p) => p.value === 3));
});

// ---------------------------------------------------------------------------
// NUMERIC_AXIS_FIX: M16, M17, M26, M27 line x-coordinates must be numbers
// ---------------------------------------------------------------------------

test('M16: line x-coordinates are numeric seconds, never the formatted atUtc string; red/blue step-interpolated', () => {
  const registration = registrationsById.get('M16')!;
  const frame = registration.adapt(golden.M16, spec('M16', 'line'), ctx());
  const data = asLine(frame.data!);
  assert.equal(data.xType, 'number');
  assert.ok(data.series.length > 0);
  for (const series of data.series) {
    assert.equal(
      series.interpolation,
      'step',
      'M16 red/blue are discrete score increments, not continuous'
    );
    for (const point of series.points) {
      assert.equal(typeof point.x, 'number', 'x must be a number');
      assert.ok(Number.isFinite(point.x));
    }
  }
  // Chronological order within each series.
  for (const series of data.series) {
    for (let i = 1; i < series.points.length; i++)
      assert.ok(series.points[i].x >= series.points[i - 1].x);
  }
  const firstMatchRedSeries = data.series.find((s) =>
    s.label.endsWith('Red score')
  );
  assert.ok(firstMatchRedSeries);
  assert.equal(
    firstMatchRedSeries!.points[0].x,
    0,
    'second=0 sample is preserved as the number 0, not dropped as falsy'
  );
});

test('M17: line x-coordinates are numeric seconds; margin is linearly interpolated (a smooth broadcast lead-tracker)', () => {
  const registration = registrationsById.get('M17')!;
  const frame = registration.adapt(golden.M17, spec('M17', 'line'), ctx());
  const data = asLine(frame.data!);
  assert.equal(data.xType, 'number');
  assert.ok(data.series.length > 0);
  for (const series of data.series) {
    assert.equal(series.interpolation, 'linear');
    for (const point of series.points) assert.equal(typeof point.x, 'number');
  }
});

test('M26: line x-coordinates are the numeric elapsed seconds, not the atUtc string or a formatted label', () => {
  const registration = registrationsById.get('M26')!;
  const rows = goldenData('M26') as { value: { seconds: number }[] | null }[];
  const firstSeconds = rows[0].value![0].seconds;
  assert.equal(typeof firstSeconds, 'number');
  const frame = registration.adapt(golden.M26, spec('M26', 'line'), ctx());
  const data = asLine(frame.data!);
  assert.equal(data.xType, 'number');
  assert.ok(data.series.length > 0);
  for (const series of data.series) {
    assert.equal(
      series.interpolation,
      'step',
      'threshold is a discrete counter'
    );
    for (const point of series.points) assert.equal(typeof point.x, 'number');
  }
  assert.equal(data.series[0].points[0].x, firstSeconds);
});

test('M27: line x-coordinates are numeric and preserve genuinely negative pre-match offsets', () => {
  const registration = registrationsById.get('M27')!;
  const rows = goldenData('M27') as {
    tournamentKey: string;
    matchId: number;
    value: { seconds: number | null }[] | null;
  }[];
  const firstRow = rows.find(
    (r) => r.tournamentKey === 'q' && r.matchId === 1
  )!;
  assert.equal(
    firstRow.value![0].seconds,
    -25,
    'golden fixture: revision 1 occurs 25s before actualStartTime'
  );

  const frame = registration.adapt(golden.M27, spec('M27', 'line'), ctx());
  const data = asLine(frame.data!);
  assert.equal(data.xType, 'number');
  for (const series of data.series) {
    assert.equal(
      series.interpolation,
      'step',
      'a climb multiplier holds constant between revisions'
    );
    for (const point of series.points) {
      assert.equal(typeof point.x, 'number');
      assert.ok(Number.isFinite(point.x));
    }
  }
  const negativeXPoints = data.series
    .flatMap((s) => s.points)
    .filter((p) => p.x < 0);
  assert.ok(
    negativeXPoints.length > 0,
    'at least one real pre-match (negative-second) sample must survive into the frame'
  );
  assert.ok(negativeXPoints.some((p) => p.x === -25));
});

// ---------------------------------------------------------------------------
// M15: explicit required `atUtc` parameter
// ---------------------------------------------------------------------------

test('M15: a missing atUtc parameter is an explicit preparation failure, never a fabricated "now"', () => {
  const registration = registrationsById.get('M15')!;
  assert.throws(
    () => registration.adapt(golden.M15, spec('M15', 'table', {}), ctx()),
    (err: unknown) =>
      err instanceof SemanticPreparationError &&
      /requires an explicit ISO atUtc parameter/.test(err.message),
    'missing atUtc must throw SemanticPreparationError, and must not silently default'
  );
  // A non-ISO value is likewise rejected, not coerced.
  assert.throws(() =>
    registration.adapt(
      golden.M15,
      spec('M15', 'table', { atUtc: 'not-a-date' }),
      ctx()
    )
  );
});

test('M15: with an explicit atUtc, produces a table with real (non-fabricated) redScore/blueScore cells', () => {
  const registration = registrationsById.get('M15')!;
  const frame = registration.adapt(
    golden.M15,
    spec('M15', 'table', { atUtc: '2026-09-01T12:00:10.000Z' }),
    ctx()
  );
  const data = frame.data!;
  assert.equal(data.kind, 'table');
  assert.ok(data.rows.length > 0);
  const first = data.rows[0];
  assert.equal(typeof first.cells.redScore, 'number');
  assert.equal(typeof first.cells.blueScore, 'number');
});

// ---------------------------------------------------------------------------
// LEGITIMATELY_EMPTY: synthetic ok() fixtures with zero real content
// ---------------------------------------------------------------------------

test('M9: zero unit-sized physical wildfire edits is a legitimately empty bar, not a source failure', () => {
  const registration = registrationsById.get('M9')!;
  const frame = registration.adapt(ok([]), spec('M9', 'bar'), ctx());
  assert.equal(
    frame.emptyReason,
    'No unit-sized physical wildfire edits were captured; referees may have typed totals instead of tapping +1/-1'
  );
  assert.equal(frame.data!.kind, 'bar');
});

test('M5: every match with fewer than two detail snapshots is a legitimately empty table', () => {
  const registration = registrationsById.get('M5')!;
  const data = [
    { eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null },
    { eventKey: 'e', tournamentKey: 'q', matchId: 2, value: null }
  ];
  const frame = registration.adapt(ok(data), spec('M5', 'table'), ctx());
  assert.equal(
    frame.emptyReason,
    'No queried match has at least two detail-history snapshots, so no corrected-field ranking could be computed'
  );
});

test('M12: zero captured field-level actions across every match is a legitimately empty table', () => {
  const registration = registrationsById.get('M12')!;
  const data = [{ eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null }];
  const frame = registration.adapt(ok(data), spec('M12', 'table'), ctx());
  assert.equal(
    frame.emptyReason,
    'No queried match captured any field-level action event, so no replay-vs-snapshot reconciliation could be checked'
  );
});

test('M23: zero captured actor names across every match is a legitimately empty credit-roll table', () => {
  const registration = registrationsById.get('M23')!;
  const data = [
    { eventKey: 'e', tournamentKey: 'q', matchId: 1, actors: [] },
    { eventKey: 'e', tournamentKey: 'q', matchId: 2, actors: [] }
  ];
  const frame = registration.adapt(ok(data), spec('M23', 'table'), ctx());
  assert.equal(
    frame.emptyReason,
    'No queried match captured an actorName; the credit-roll table has nothing to show'
  );
});

test('M16/M17: no reconstructable replay in any match is a legitimately empty line, not a fabricated flat curve', () => {
  const data = [{ eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null }];
  for (const id of ['M16', 'M17']) {
    const registration = registrationsById.get(id)!;
    const frame = registration.adapt(ok(data), spec(id, 'line'), ctx());
    assert.ok(
      frame.emptyReason && frame.emptyReason.length > 0,
      `${id}: emptyReason required`
    );
    assert.equal(frame.data!.kind, 'line');
    assert.deepEqual((frame.data as { series: unknown[] }).series, []);
  }
});

test('M26: no queried match ever crossed the coopertition threshold is a legitimately empty line', () => {
  const registration = registrationsById.get('M26')!;
  const data = [{ eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null }];
  const frame = registration.adapt(ok(data), spec('M26', 'line'), ctx());
  assert.equal(
    frame.emptyReason,
    'No queried match ever crossed the coopertition 4/5/6 threshold, so no flip-timing curve exists'
  );
});

test('M27: no detail-history snapshot for any match is a legitimately empty line', () => {
  const registration = registrationsById.get('M27')!;
  const data = [{ eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null }];
  const frame = registration.adapt(ok(data), spec('M27', 'line'), ctx());
  assert.equal(
    frame.emptyReason,
    'No detail-history snapshot exists for any queried match, so no multiplier trajectory could be reconstructed'
  );
});

test('M26: a crossing with an unlocatable (null) seconds offset is dropped from the line and reported in notes, never plotted at a fabricated x', () => {
  const registration = registrationsById.get('M26')!;
  const data = [
    {
      eventKey: 'e',
      tournamentKey: 'q',
      matchId: 1,
      value: [
        { threshold: 4, atUtc: '2026-09-01T12:02:00.000Z', seconds: null },
        { threshold: 5, atUtc: '2026-09-01T12:02:10.000Z', seconds: 10 }
      ]
    }
  ];
  const frame = registration.adapt(ok(data), spec('M26', 'line'), ctx());
  const data2 = frame.data as {
    series: { points: { x: number; value: number | null }[] }[];
  };
  assert.equal(
    data2.series[0].points.length,
    1,
    'the null-seconds crossing must be dropped, not plotted at x=0'
  );
  assert.equal(data2.series[0].points[0].x, 10);
  assert.ok(frame.notes?.some((n) => n.includes('omitted')));
});

// ---------------------------------------------------------------------------
// NULL_OBSERVATION: null values are preserved, never coerced to 0
// ---------------------------------------------------------------------------

test('M9: a group with a null medianSeconds (fewer than two unit taps) preserves null, never coerces to 0', () => {
  const registration = registrationsById.get('M9')!;
  const data = [
    { group: 'g1', medianSeconds: null },
    { group: 'g2', medianSeconds: 12 }
  ];
  const frame = registration.adapt(ok(data), spec('M9', 'bar'), ctx());
  const barData = frame.data as {
    series: { points: { entityId: string; value: number | null }[] }[];
    entities: { id: string; label: string }[];
  };
  const g1 = barData.entities.find((e) => e.label === 'g1')!;
  const point = barData.series[0].points.find((p) => p.entityId === g1.id)!;
  assert.equal(point.value, null);
  assert.notEqual(point.value, 0);
});

test('M13: a match with zero captured actions reports null for every counter, not a fabricated zero', () => {
  const registration = registrationsById.get('M13')!;
  const data = [{ eventKey: 'e', tournamentKey: 'q', matchId: 1, value: null }];
  const frame = registration.adapt(ok(data), spec('M13', 'grouped-bar'), ctx());
  const gb = frame.data as {
    series: { id: string; points: { value: number | null }[] }[];
  };
  for (const series of gb.series) {
    assert.equal(
      series.points[0].value,
      null,
      `${series.id} must be null, not 0`
    );
  }
});

test('M4: a genuinely zero net score correction is preserved as the number 0, distinct from null', () => {
  const registration = registrationsById.get('M4')!;
  const frame = registration.adapt(golden.M4, spec('M4', 'bar'), ctx());
  const barData = frame.data as {
    series: { points: { value: number | null }[] }[];
  };
  assert.ok(barData.series[0].points.every((p) => p.value === 0));
  assert.ok(barData.series[0].points.every((p) => p.value !== null));
});

// ---------------------------------------------------------------------------
// Coverage sanity: every id resolves through the shared factories correctly
// ---------------------------------------------------------------------------

test('M8/M21/M10/M11/M22/M25: scalar and simple-array ids validate against real golden data with correct kinds', () => {
  const expectations: [string, GraphicKind][] = [
    ['M8', 'bar'],
    ['M21', 'bar'],
    ['M10', 'stat-tile'],
    ['M11', 'stat-tile'],
    ['M22', 'stat-tile'],
    ['M25', 'stat-tile']
  ];
  for (const [id, kind] of expectations) {
    const registration = registrationsById.get(id)!;
    assert.equal(
      registration.metadata.defaultKind,
      kind,
      `${id}: expected defaultKind ${kind}`
    );
    const frame = registration.adapt(golden[id], spec(id, kind), ctx());
    assert.equal(frame.data!.kind, kind);
  }
});
