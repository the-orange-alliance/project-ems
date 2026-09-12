/**
 * The aggregate coverage test for the merged FGC2026 semantic presentation
 * registry (`../presentation/semantic-registry.ts`).
 *
 * Everything here is derived from real, authoritative sources rather than a
 * hand-transcribed list:
 *   - coverage is checked against the real `catalogue` (`../catalogue.ts`),
 *     never a hardcoded id list;
 *   - manifest expectations are checked against the real golden `StatResult`
 *     per id (`./golden.json`, produced deterministically by
 *     `contracts.test.ts`), never a fabricated fixture.
 *
 * Placed under `seasons/stats/tests` (not `presentation/`) because the
 * package `test` script globs only `build/seasons/stats/tests/*.test.js` —
 * see `libs/models/package.json`. A file under `presentation/` would
 * compile but silently never run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogue } from '../catalogue.js';
import {
  SEMANTIC_PRESENTATION_REGISTRY,
  FGC2026_SEASON_KEY,
  semanticRegistrationFor,
  buildSemanticRegistry,
  prepareGraphicFrame
} from '../presentation/semantic-registry.js';
import {
  matchEntity,
  teamEntity,
  stableEntityId,
  SemanticPreparationError,
  type SemanticRegistration
} from '../presentation/semantic-helpers.js';
import { adaptResult, type AdaptContext } from '../presentation/adapters.js';
import {
  presentationFrameZod,
  graphicKindZod,
  SUPPORTED_GRAPHIC_MODES,
  type GraphicKind,
  type GraphicSpec,
  type PresentationData
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';

type OkResult = Extract<StatResult, { status: 'ok' }>;

const golden: Record<string, StatResult> = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);

const teams = Array.from({ length: 8 }, (_, i) => ({
  teamKey: i + 1,
  teamNumber: String(i + 1),
  teamNameShort: `Team ${i + 1}`
}));

const matches = (['q', 'r', 'p', 'f'] as const).flatMap((tournamentKey) =>
  Array.from({ length: tournamentKey === 'f' ? 2 : 4 }, (_, i) => ({
    tournamentKey,
    id: i + 1,
    name: `${tournamentKey.toUpperCase()}${i + 1}`
  }))
);

function ctx(catalogueId: string): AdaptContext {
  return { catalogueId, asOfUtc: '2026-09-01T15:00:00.000Z', teams, matches };
}

/**
 * M15 is the only registration whose `adapt()` actually reads a required
 * `spec.params` value at runtime (`atUtc` -- see `fgc2026-m.ts`). Every
 * other `requiredParams` entry across the four modules is declarative UI
 * metadata only, unread by `adapt()` itself (verified: `spec.params.` is
 * referenced nowhere else in `fgc2026-a-d.ts` / `fgc2026-e-h.ts` /
 * `fgc2026-i-l.ts`), so a generic empty `params: {}` is otherwise correct.
 */
function paramsFor(catalogueId: string): Record<string, string> {
  return catalogueId === 'M15' ? { atUtc: '2026-09-01T12:00:10.000Z' } : {};
}

function buildSpec(
  registration: SemanticRegistration,
  kind: GraphicKind = registration.metadata.defaultKind
): GraphicSpec {
  const mode =
    registration.metadata.modesByKind[kind]?.[0] ??
    SUPPORTED_GRAPHIC_MODES[kind][0];
  return {
    id: `test-${registration.catalogueId}-${kind}`,
    title: registration.catalogueId,
    stat: registration.catalogueId,
    selectors: {},
    filters: {},
    params: paramsFor(registration.catalogueId),
    kind,
    mode,
    options: {}
  };
}

function goldenFor(id: string): StatResult {
  const result = golden[id];
  assert.ok(result, `${id}: golden fixture present`);
  return result;
}

function goldenOk(id: string): OkResult {
  const result = goldenFor(id);
  assert.equal(result.status, 'ok', `${id}: golden fixture expected to be ok`);
  return result as OkResult;
}

function asTable(
  data: PresentationData
): Extract<PresentationData, { kind: 'table' | 'ranking-table' }> {
  if (data.kind !== 'table' && data.kind !== 'ranking-table') {
    throw new Error(`expected table/ranking-table data, got ${data.kind}`);
  }
  return data;
}

function asLine(
  data: PresentationData
): Extract<PresentationData, { kind: 'line' }> {
  if (data.kind !== 'line')
    throw new Error(`expected line data, got ${data.kind}`);
  return data;
}

const ALL_KINDS = graphicKindZod.options;

// ---------------------------------------------------------------------------
// Coverage: exactly the current 232 catalogue IDs, no more, no fewer.
// ---------------------------------------------------------------------------

test('the merged registry covers exactly the current 232 catalogue IDs -- none missing, none extra', () => {
  assert.equal(
    catalogue.length,
    232,
    'catalogue has 232 rows (this test is stale if that count ever moves)'
  );
  const catalogueIds = new Set<string>(
    catalogue.map((row): string => row.catalogueId)
  );
  assert.equal(catalogueIds.size, 232, 'catalogue ids are unique');

  const registeredIds = new Set(
    [...SEMANTIC_PRESENTATION_REGISTRY.values()].map((r) => r.catalogueId)
  );
  assert.equal(
    SEMANTIC_PRESENTATION_REGISTRY.size,
    232,
    'the merged registry has exactly 232 entries'
  );
  assert.equal(registeredIds.size, 232, 'registered catalogue ids are unique');

  const missing = [...catalogueIds]
    .filter((id) => !registeredIds.has(id))
    .sort();
  assert.deepEqual(
    missing,
    [],
    `catalogue ids with NO semantic registration: ${missing.join(', ') || 'none'}`
  );

  const extra = [...registeredIds].filter((id) => !catalogueIds.has(id)).sort();
  assert.deepEqual(
    extra,
    [],
    `registered ids not present in the current catalogue: ${extra.join(', ') || 'none'}`
  );

  for (const id of catalogueIds) {
    const registration = semanticRegistrationFor(FGC2026_SEASON_KEY, id);
    assert.ok(registration, `${id}: semanticRegistrationFor must resolve it`);
    assert.equal(registration!.catalogueId, id);
    assert.equal(registration!.seasonKey, FGC2026_SEASON_KEY);
    assert.ok(
      registration!.metadata.supportedKinds.includes(
        registration!.metadata.defaultKind
      ),
      `${id}: defaultKind ${registration!.metadata.defaultKind} must be one of supportedKinds ${registration!.metadata.supportedKinds.join(',')}`
    );
    assert.ok(
      registration!.manifest.assertions.length > 0,
      `${id}: manifest must document at least one assertion`
    );
    assert.equal(
      registration!.manifest.catalogueId,
      id,
      `${id}: manifest.catalogueId must match`
    );
  }
});

test('duplicate-key detection: two registrations for the same (season, catalogueId) fail loudly, never a silent overwrite', () => {
  const [first] = SEMANTIC_PRESENTATION_REGISTRY.values();
  assert.throws(
    () => buildSemanticRegistry([first, first]),
    /Duplicate semantic presentation registrations/,
    'a colliding key must throw, not last-write-wins'
  );
  // A collision across otherwise-distinct registration objects (same season + id, different content) must also throw.
  const impostor: SemanticRegistration = {
    ...first,
    manifest: { ...first.manifest }
  };
  assert.throws(
    () => buildSemanticRegistry([first, impostor]),
    /Duplicate semantic presentation registrations/
  );
});

// ---------------------------------------------------------------------------
// Every manifest matches its real golden fixture.
// ---------------------------------------------------------------------------

test('every registered manifest matches its real golden fixture (source-failure / legitimately-empty / nonempty)', () => {
  for (const registration of SEMANTIC_PRESENTATION_REGISTRY.values()) {
    const id = registration.catalogueId;
    const result = goldenFor(id);
    const spec = buildSpec(registration);

    if (registration.manifest.fixtureExpectation === 'source-failure') {
      assert.notEqual(
        result.status,
        'ok',
        `${id}: manifest says source-failure but the golden fixture is ok`
      );
      assert.throws(
        () => registration.adapt(result, spec, ctx(id)),
        SemanticPreparationError,
        `${id}: a source failure must throw an actionable error, never fabricate a frame`
      );
      continue;
    }

    assert.equal(
      result.status,
      'ok',
      `${id}: manifest says ${registration.manifest.fixtureExpectation} but the golden fixture is not ok`
    );
    const frame = registration.adapt(result, spec, ctx(id));
    const parsed = presentationFrameZod.safeParse(frame);
    assert.ok(
      parsed.success,
      `${id}: default-kind frame failed presentationFrameZod: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`
    );
    assert.equal(
      frame.data.kind,
      spec.kind,
      `${id}: frame kind must match the requested spec.kind`
    );

    if (registration.manifest.fixtureExpectation === 'legitimately-empty') {
      assert.ok(
        frame.emptyReason,
        `${id}: manifest says legitimately-empty but the frame carries no emptyReason`
      );
    } else {
      assert.equal(
        frame.emptyReason,
        undefined,
        `${id}: manifest says nonempty but the frame carries an emptyReason (${frame.emptyReason})`
      );
    }

    // adapt() must be deterministic for identical inputs -- the module's own documented contract.
    const frame2 = registration.adapt(result, spec, ctx(id));
    assert.deepEqual(
      frame2,
      frame,
      `${id}: adapt() is not deterministic for identical inputs`
    );
  }
});

// ---------------------------------------------------------------------------
// Every advertised kind (not just the default) produces a valid, meaningful frame.
// ---------------------------------------------------------------------------

test('every advertised visualization kind for every registered id produces a valid, schema-conformant frame', () => {
  for (const registration of SEMANTIC_PRESENTATION_REGISTRY.values()) {
    const id = registration.catalogueId;
    if (registration.manifest.fixtureExpectation === 'source-failure') continue; // no kind can render a source failure; covered above
    const result = goldenOk(id);

    for (const kind of registration.metadata.supportedKinds) {
      const spec = buildSpec(registration, kind);
      let frame: ReturnType<SemanticRegistration['adapt']> | undefined;
      assert.doesNotThrow(() => {
        frame = registration.adapt(result, spec, ctx(id));
      }, `${id}/${kind}: an advertised supported kind must not throw`);
      const parsed = presentationFrameZod.safeParse(frame);
      assert.ok(
        parsed.success,
        `${id}/${kind}: failed presentationFrameZod: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`
      );
      assert.equal(
        frame!.data.kind,
        kind,
        `${id}/${kind}: frame must carry the requested kind`
      );
      if (registration.manifest.fixtureExpectation === 'nonempty') {
        assert.equal(
          frame!.emptyReason,
          undefined,
          `${id}/${kind}: nonempty manifest but this advertised kind produced an emptyReason`
        );
      }
    }
  }
});

test('a kind NOT advertised by a registration is an actionable preparation error, never a blank "ready" frame', () => {
  let exercised = 0;
  for (const registration of SEMANTIC_PRESENTATION_REGISTRY.values()) {
    if (registration.manifest.fixtureExpectation === 'source-failure') continue;
    const unsupportedKind = ALL_KINDS.find(
      (k) => !registration.metadata.supportedKinds.includes(k)
    );
    if (!unsupportedKind) continue; // a registration advertising every kind has nothing to prove here
    const result = goldenOk(registration.catalogueId);
    const spec: GraphicSpec = {
      id: `test-${registration.catalogueId}-unsupported`,
      title: registration.catalogueId,
      stat: registration.catalogueId,
      selectors: {},
      filters: {},
      params: {},
      kind: unsupportedKind,
      mode: SUPPORTED_GRAPHIC_MODES[unsupportedKind][0],
      options: {}
    };
    assert.throws(
      () => registration.adapt(result, spec, ctx(registration.catalogueId)),
      SemanticPreparationError,
      `${registration.catalogueId}/${unsupportedKind}: an unsupported kind must throw SemanticPreparationError`
    );
    exercised += 1;
  }
  assert.ok(
    exercised > 0,
    'fixture assumption: at least one registration has a non-advertised kind to test against'
  );
});

// ---------------------------------------------------------------------------
// Production wiring: prepareGraphicFrame's fallback policy.
// ---------------------------------------------------------------------------

test('prepareGraphicFrame: an unregistered catalogue id falls back to the untouched legacy adapter', () => {
  const unregisteredId = 'ZZ999-NOT-A-REAL-CATALOGUE-ID';
  assert.equal(
    semanticRegistrationFor(FGC2026_SEASON_KEY, unregisteredId),
    undefined,
    'fixture assumption: this id must have no registration'
  );
  const okResult: OkResult = {
    status: 'ok',
    data: 42,
    quality: 'complete',
    warnings: []
  };
  const spec: GraphicSpec = {
    id: 'x',
    title: 'x',
    stat: unregisteredId,
    selectors: {},
    filters: {},
    params: {},
    kind: 'stat-tile',
    mode: 'fullscreen',
    options: {}
  };
  const context = ctx(unregisteredId);

  const viaWrapper = prepareGraphicFrame(okResult, spec, context);
  const viaLegacy = adaptResult(okResult, spec, context);
  assert.deepEqual(
    viaWrapper,
    viaLegacy,
    'an unregistered id must be byte-identical to calling the legacy adaptResult directly'
  );
  assert.equal(
    viaWrapper.schemaVersion,
    undefined,
    'the legacy fallback never claims schemaVersion 2'
  );
  assert.equal(
    viaWrapper.data,
    undefined,
    'the legacy fallback never claims v2 semantic data'
  );
});

test('prepareGraphicFrame: a registered id ALWAYS takes the semantic path, even when it must throw', () => {
  const registration = semanticRegistrationFor(FGC2026_SEASON_KEY, 'A19')!;
  assert.deepEqual(
    registration.metadata.supportedKinds,
    ['table'],
    'fixture assumption: A19 supports only "table"'
  );
  const result = goldenOk('A19');
  const spec: GraphicSpec = {
    id: 'x',
    title: 'x',
    stat: 'A19',
    selectors: {},
    filters: {},
    params: {},
    kind: 'bar',
    mode: 'fullscreen',
    options: {}
  };
  assert.throws(
    () => prepareGraphicFrame(result, spec, ctx('A19')),
    (err: unknown) =>
      err instanceof SemanticPreparationError &&
      err.code === 'PRESENTATION_FAILED' &&
      err.message.length > 0,
    'an unsupported kind on a REGISTERED id must surface an actionable (non-empty-message) SemanticPreparationError through the production wrapper -- never an empty frame marked ready'
  );

  // And the happy path really does take the semantic (schemaVersion 2) route, not the legacy fallback.
  const happySpec = buildSpec(registration);
  const frame = prepareGraphicFrame(result, happySpec, ctx('A19'));
  assert.equal(
    frame.schemaVersion,
    2,
    'a registered id must produce a v2 semantic frame'
  );
  assert.ok(frame.data, 'a registered id must carry typed semantic data');
});

// ---------------------------------------------------------------------------
// Named regressions.
// ---------------------------------------------------------------------------

test('REGRESSION A19: full red/blue p10/p50/p90 prediction quantile arrays survive as named cells, never collapsed to null', () => {
  const registration = semanticRegistrationFor(FGC2026_SEASON_KEY, 'A19')!;
  const result = goldenOk('A19');
  const rawRows = result.data as {
    tournamentKey: string;
    matchId: number;
    value?: { red: number[]; blue: number[]; samples: number };
    status?: string;
    reason?: string;
  }[];

  const row3 = rawRows.find((r) => r.tournamentKey === 'q' && r.matchId === 3);
  assert.ok(row3?.value, 'fixture assumption: q/3 carries a real prediction');

  const frame = registration.adapt(result, buildSpec(registration), ctx('A19'));
  const data = asTable(frame.data);
  const row3Id = matchEntity('q', 3, ctx('A19')).id;
  const matchedRow = data.rows.find((r) => r.id === row3Id);
  assert.ok(
    matchedRow,
    'A19: table row for q/3 must exist under its tournament-qualified match identity'
  );
  assert.equal(matchedRow!.cells.redP10, row3!.value!.red[0]);
  assert.equal(matchedRow!.cells.redP50, row3!.value!.red[1]);
  assert.equal(matchedRow!.cells.redP90, row3!.value!.red[2]);
  assert.equal(matchedRow!.cells.blueP10, row3!.value!.blue[0]);
  assert.equal(matchedRow!.cells.blueP50, row3!.value!.blue[1]);
  assert.equal(matchedRow!.cells.blueP90, row3!.value!.blue[2]);
  assert.equal(matchedRow!.cells.samples, row3!.value!.samples);

  const infeasibleRow = rawRows.find((r) => r.status === 'insufficient_data');
  assert.ok(
    infeasibleRow,
    'fixture assumption: at least one infeasible A19 row exists'
  );
  const infeasibleId = matchEntity(
    infeasibleRow!.tournamentKey,
    infeasibleRow!.matchId,
    ctx('A19')
  ).id;
  const infeasibleTableRow = data.rows.find((r) => r.id === infeasibleId);
  assert.ok(
    infeasibleTableRow,
    'A19: an infeasible row must still produce a table row (with null cells), never be silently dropped'
  );
  for (const key of Object.keys(infeasibleTableRow!.cells)) {
    assert.equal(
      infeasibleTableRow!.cells[key],
      null,
      `A19: infeasible row cell "${key}" must be null, not fabricated`
    );
  }
  assert.ok(
    frame.notes?.some((n) => n.includes(infeasibleRow!.reason!)),
    'A19: the real infeasibility reason must survive into notes'
  );
});

test('REGRESSION B13/B14: line x-coordinates are real numbers, never a formatted string baked into the axis', () => {
  for (const id of ['B13', 'B14']) {
    const registration = semanticRegistrationFor(FGC2026_SEASON_KEY, id)!;
    const result = goldenOk(id);
    const frame = registration.adapt(result, buildSpec(registration), ctx(id));
    const data = asLine(frame.data);
    assert.ok(
      data.series.length > 0,
      `${id}: expected at least one plotted series`
    );
    for (const series of data.series) {
      assert.ok(
        series.points.length > 0,
        `${id}/${series.id}: expected at least one point`
      );
      for (const point of series.points) {
        assert.equal(
          typeof point.x,
          'number',
          `${id}: x must be a number, got ${typeof point.x} (${JSON.stringify(point.x)})`
        );
        assert.ok(Number.isFinite(point.x), `${id}: x must be finite`);
      }
    }
  }

  // B13 specifically: the real seconds values survive verbatim, in order, as x -- the "N balls" milestone becomes the point label/value, never the axis.
  const b13 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'B13')!;
  const result = goldenOk('B13');
  const rawRow = (
    result.data as {
      tournamentKey: string;
      matchId: number;
      value: { milestone: number; seconds: number | null }[];
    }[]
  ).find((r) => r.tournamentKey === 'q' && r.matchId === 1)!;
  const frame = b13.adapt(result, buildSpec(b13), ctx('B13'));
  const data = asLine(frame.data);
  const seriesId = matchEntity('q', 1, ctx('B13')).id;
  const series = data.series.find((s) => s.id === seriesId);
  assert.ok(series, 'B13: q/1 series must exist');
  const reachedSeconds = rawRow.value
    .filter((m) => m.seconds !== null)
    .map((m) => m.seconds);
  assert.deepEqual(
    series!.points.map((p) => p.x),
    reachedSeconds,
    'B13: x-coordinates equal the real seconds values verbatim, in order'
  );
  for (const point of series!.points) {
    assert.notEqual(
      typeof point.x,
      'string',
      'B13: x must never be the formatted "Ns" string'
    );
  }
});

test('REGRESSION seven known numeric-axis defects (B13, B14, H6, M16, M17, M26, M27): every x-coordinate is real and numeric', () => {
  const ids = ['B13', 'B14', 'H6', 'M16', 'M17', 'M26', 'M27'];
  for (const id of ids) {
    const registration = semanticRegistrationFor(FGC2026_SEASON_KEY, id)!;
    assert.ok(
      registration.metadata.supportedKinds.includes('line'),
      `${id}: expected a line-capable registration`
    );
    const result = goldenOk(id);
    const frame = registration.adapt(
      result,
      buildSpec(registration, 'line'),
      ctx(id)
    );
    const data = asLine(frame.data);
    assert.ok(
      data.series.length > 0,
      `${id}: expected at least one plotted line series`
    );
    for (const series of data.series) {
      assert.ok(
        series.points.length > 0,
        `${id}/${series.id}: expected at least one point`
      );
      for (const point of series.points) {
        assert.equal(
          typeof point.x,
          'number',
          `${id}: x must be numeric, got ${JSON.stringify(point.x)}`
        );
        assert.ok(Number.isFinite(point.x), `${id}: x must be finite`);
      }
    }
  }

  // M16 specifically: x equals the raw numeric `second` field, never the atUtc ISO string.
  const m16 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'M16')!;
  const m16Result = goldenOk('M16');
  const raw = (
    m16Result.data as {
      tournamentKey: string;
      matchId: number;
      value:
        { second: number; atUtc: string; red: number; blue: number }[] | null;
    }[]
  ).find((r) => r.tournamentKey === 'q' && r.matchId === 1)!;
  assert.ok(
    Array.isArray(raw.value) && raw.value.length > 0,
    'fixture assumption: q/1 has a real M16 replay'
  );
  const frame = m16.adapt(m16Result, buildSpec(m16), ctx('M16'));
  const data = asLine(frame.data);
  const redSeries = data.series.find(
    (s) => s.id === `${matchEntity('q', 1, ctx('M16')).id}:red`
  );
  assert.ok(redSeries, 'M16: q/1 red series must exist');
  assert.deepEqual(
    redSeries!.points.map((p) => p.x),
    raw.value!.map((s) => s.second),
    'M16: x equals the numeric second field verbatim'
  );
});

test('REGRESSION J1/J2: real strings (country name/code, robot name) survive as text cells, never dropped for being non-numeric', () => {
  const j1 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'J1')!;
  const j1Result = goldenOk('J1');
  const j1Frame = j1.adapt(j1Result, buildSpec(j1, 'table'), ctx('J1'));
  const j1Data = asTable(j1Frame.data);
  const j1Raw = j1Result.data as {
    teamKey: number;
    country: string | null;
    countryCode: string | null;
  }[];
  assert.ok(j1Raw.length > 0, 'fixture assumption: J1 golden has team rows');
  for (const raw of j1Raw) {
    const row = j1Data.rows.find(
      (r) => r.id === teamEntity(raw.teamKey, ctx('J1')).id
    );
    assert.ok(row, `J1: team ${raw.teamKey} row must exist`);
    assert.equal(
      row!.cells.country,
      raw.country,
      `J1: team ${raw.teamKey} country string must survive verbatim`
    );
    assert.equal(
      row!.cells.countryCode,
      raw.countryCode,
      `J1: team ${raw.teamKey} country code must survive verbatim`
    );
    assert.equal(
      typeof row!.cells.country,
      'string',
      'J1: country must remain a real string, not dropped/nulled for being non-numeric'
    );
  }

  const j2 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'J2')!;
  const j2Result = goldenOk('J2');
  const j2Frame = j2.adapt(j2Result, buildSpec(j2), ctx('J2'));
  const j2Data = asTable(j2Frame.data);
  const j2Raw = j2Result.data as {
    teamKey: number;
    robotName: string | null;
  }[];
  assert.ok(j2Raw.length > 0, 'fixture assumption: J2 golden has team rows');
  for (const raw of j2Raw) {
    const row = j2Data.rows.find(
      (r) => r.id === teamEntity(raw.teamKey, ctx('J2')).id
    );
    assert.ok(row, `J2: team ${raw.teamKey} row must exist`);
    assert.equal(
      row!.cells.robotName,
      raw.robotName,
      'J2: robot name string must survive verbatim, not dropped for being non-numeric'
    );
  }
});

test('REGRESSION H12/J4: row identity is the team, and rank is authoritative -- carried verbatim, never derived from array position', () => {
  const h12 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'H12')!;
  const h12Result = goldenOk('H12');
  const h12Frame = h12.adapt(h12Result, buildSpec(h12), ctx('H12'));
  const h12Data = asTable(h12Frame.data);
  const h12Raw = h12Result.data as {
    teamKey: number;
    tournamentKey: string;
    rank: number;
    climbPoints: number;
  }[];
  assert.ok(
    h12Raw.length > 0,
    'fixture assumption: H12 golden has ranking rows'
  );

  // At least two rows must share a climbPoints value -- proving identity cannot be climbPoints-derived.
  const byClimbPoints = new Map<number, number[]>();
  for (const raw of h12Raw) {
    byClimbPoints.set(raw.climbPoints, [
      ...(byClimbPoints.get(raw.climbPoints) ?? []),
      raw.teamKey
    ]);
  }
  assert.ok(
    [...byClimbPoints.values()].some((teamKeys) => teamKeys.length > 1),
    'fixture assumption: at least two H12 rows share a climbPoints value'
  );

  for (const raw of h12Raw) {
    const expectedId = stableEntityId(
      'team-ranking',
      raw.tournamentKey,
      raw.teamKey
    );
    const row = h12Data.rows.find((r) => r.id === expectedId);
    assert.ok(
      row,
      `H12: team ${raw.teamKey} row must exist under its tournament-qualified team identity`
    );
    assert.equal(
      row!.rank,
      raw.rank,
      `H12: team ${raw.teamKey} rank must be the source rank verbatim`
    );
  }
  // Distinct rows for teams sharing a climbPoints value confirms identity is the team, not the metric.
  const rowIds = new Set(h12Data.rows.map((r) => r.id));
  assert.equal(
    rowIds.size,
    h12Raw.length,
    'H12: every team produces its own distinct row identity'
  );

  const j4 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'J4')!;
  const j4Result = goldenOk('J4');
  const j4Frame = j4.adapt(j4Result, buildSpec(j4), ctx('J4'));
  const j4Data = asTable(j4Frame.data);
  const j4Raw = j4Result.data as { teamKey: number; rank: number };
  assert.equal(j4Data.rows.length, 1, 'J4: exactly one row');
  assert.equal(
    j4Data.rows[0].id,
    teamEntity(j4Raw.teamKey, ctx('J4')).id,
    'J4: row identity is the team'
  );
  assert.equal(
    j4Data.rows[0].rank,
    j4Raw.rank,
    'J4: rank is authoritative, taken from the source verbatim'
  );
});

test('REGRESSION L11: nested teams[].rank is authoritative and is never renumbered by array/flatten position', () => {
  const l11 = semanticRegistrationFor(FGC2026_SEASON_KEY, 'L11')!;
  const result = goldenOk('L11');
  const frame = l11.adapt(result, buildSpec(l11), ctx('L11'));
  const data = asTable(frame.data);
  const rawGroups = result.data as {
    boundary: number;
    teams: { teamKey: number; rank: number; rankingScore: number }[];
  }[];
  assert.ok(
    rawGroups.length > 0,
    'fixture assumption: L11 golden has boundary groups'
  );

  const expectedRanks = rawGroups
    .flatMap((g) => g.teams.map((t) => t.rank))
    .sort((a, b) => a - b);
  const actualRanks = data.rows
    .map((r) => r.rank)
    .sort((a, b) => (a as number) - (b as number));
  assert.deepEqual(
    actualRanks,
    expectedRanks,
    'L11: every emitted rank must be a real source rank, never 1..N by position'
  );

  const boundaryWithTeams = rawGroups.find((g) => g.teams.length > 0);
  assert.ok(
    boundaryWithTeams,
    'fixture assumption: at least one boundary has bubble teams'
  );
  for (const team of boundaryWithTeams!.teams) {
    const expectedId = stableEntityId(
      'boundary-team',
      boundaryWithTeams!.boundary,
      team.teamKey
    );
    const row = data.rows.find((r) => r.id === expectedId);
    assert.ok(
      row,
      `L11: boundary ${boundaryWithTeams!.boundary} team ${team.teamKey} row must exist`
    );
    assert.equal(
      row!.rank,
      team.rank,
      'L11: the nested rank is carried through verbatim'
    );
  }

  // A boundary with zero bubble teams contributes zero rows -- no fabricated placeholder row.
  for (const g of rawGroups) {
    if (g.teams.length === 0) {
      const anyRowForBoundary = data.rows.some(
        (row) => row.cells.boundary === g.boundary
      );
      assert.equal(
        anyRowForBoundary,
        false,
        `L11: boundary ${g.boundary} has no bubble teams and must contribute zero rows`
      );
    }
  }
});
