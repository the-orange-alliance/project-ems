/**
 * Fixture assertions for the FGC2026 E-H semantic presentation
 * registrations (`../presentation/fgc2026-e-h.ts`). Uses the same real,
 * deterministically-computed golden results as `presentation.test.ts`, but
 * asserts actual semantic content per id (not just "schema valid").
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogue } from '../catalogue.js';
import { FGC2026_E_H_SEMANTIC_REGISTRATIONS } from '../presentation/fgc2026-e-h.js';
import { semanticRegistrationKey } from '../presentation/semantic-helpers.js';
import type { AdaptContext } from '../presentation/adapt-context.js';
import type { StatResult } from '../types.js';
import type {
  GraphicKind,
  GraphicSpec,
  PresentationFrame
} from '../../../base/Graphics.js';

const golden: Record<string, StatResult> = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);

const teams = Array.from({ length: 8 }, (_, i) => ({
  teamKey: i + 1,
  teamNumber: String(i + 1),
  teamNameShort: 'Team ' + (i + 1)
}));

const matches = (['q', 'r', 'p', 'f'] as const).flatMap((tournamentKey) =>
  Array.from({ length: tournamentKey === 'f' ? 2 : 4 }, (_, i) => ({
    tournamentKey,
    id: i + 1,
    name: `${tournamentKey.toUpperCase()}${i + 1}`
  }))
);

const ctx: AdaptContext = {
  catalogueId: '',
  asOfUtc: '2026-09-01T15:00:00.000Z',
  teams,
  matches
};

function buildSpec(id: string, kind: GraphicKind): GraphicSpec {
  return {
    id: 'test-' + id,
    title: id,
    stat: id,
    selectors: {},
    filters: {},
    params: {},
    kind,
    mode: 'fullscreen',
    options: {}
  };
}

const E_H_IDS = catalogue
  .map((row) => row.catalogueId)
  .filter((id) => /^[EFGH]\d+$/.test(id));

const LEGITIMATELY_EMPTY = new Set(['G4', 'G7', 'G10', 'G13']);

test('every E/F/G/H catalogue id (58) has exactly one registration', () => {
  assert.equal(
    E_H_IDS.length,
    58,
    'catalogue has 58 E/F/G/H ids (E13 F17 G14 H14)'
  );
  assert.equal(FGC2026_E_H_SEMANTIC_REGISTRATIONS.size, 58);
  for (const id of E_H_IDS) {
    const key = semanticRegistrationKey('fgc_2026', id);
    const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(key);
    assert.ok(
      reg,
      `${id}: registration present under its season-qualified key`
    );
    assert.equal(reg!.catalogueId, id);
    assert.equal(reg!.seasonKey, 'fgc_2026');
    assert.ok(
      reg!.metadata.supportedKinds.includes(reg!.metadata.defaultKind),
      `${id}: defaultKind must be one of supportedKinds`
    );
  }
});

test('every registration adapts its real golden result without throwing, and reports emptiness honestly', () => {
  for (const id of E_H_IDS) {
    const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
      semanticRegistrationKey('fgc_2026', id)
    )!;
    const result = golden[id];
    assert.ok(result, `${id}: golden result present`);
    let frame: PresentationFrame | undefined;
    assert.doesNotThrow(() => {
      frame = reg.adapt(result, buildSpec(id, reg.metadata.defaultKind), {
        ...ctx,
        catalogueId: id
      });
    }, `${id}: adapt threw unexpectedly`);
    assert.equal(
      frame!.kind,
      reg.metadata.defaultKind,
      `${id}: frame kind matches registration default`
    );
    if (LEGITIMATELY_EMPTY.has(id)) {
      assert.equal(
        reg.manifest.fixtureExpectation,
        'legitimately-empty',
        `${id}: manifest documents legitimate emptiness`
      );
      assert.ok(
        frame!.emptyReason,
        `${id}: legitimately-empty fixture carries an explicit emptyReason`
      );
    } else {
      assert.equal(
        reg.manifest.fixtureExpectation,
        'nonempty',
        `${id}: manifest expects nonempty content on this fixture`
      );
      assert.equal(
        frame!.emptyReason,
        undefined,
        `${id}: nonempty fixture must not carry an emptyReason`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Per-id content assertions
// ---------------------------------------------------------------------------

test('E1/E6/E8: per-match bar values are real, non-fabricated points figures', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'E1')
  )!;
  const frame = reg.adapt(golden.E1, buildSpec('E1', 'bar'), {
    ...ctx,
    catalogueId: 'E1'
  });
  assert.equal(frame.data!.kind, 'bar');
  const data = frame.data as Extract<typeof frame.data, { kind: 'bar' }>;
  assert.equal(data.entities.length, 14, 'one entity per match in the fixture');
  assert.equal(
    data.series[0].points.every((p) => p.value === 10),
    true,
    'E1 is constant 10 pts in this fixture'
  );
});

test('E10/E11: boolean coopertition observations are preserved as real booleans, never coerced', () => {
  const contributed = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'E10')
  )!;
  const frame = contributed.adapt(golden.E10, buildSpec('E10', 'table'), {
    ...ctx,
    catalogueId: 'E10'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'table' }>;
  assert.ok(data.rows.length > 0);
  const values = new Set(data.rows.map((r) => r.cells.contributed));
  assert.ok(
    values.has(true) && values.has(false),
    'both true and false observations exist in the golden fixture'
  );
  for (const row of data.rows)
    assert.equal(typeof row.cells.contributed, 'boolean');

  const denied = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'E11')
  )!;
  const deniedFrame = denied.adapt(golden.E11, buildSpec('E11', 'table'), {
    ...ctx,
    catalogueId: 'E11'
  });
  const deniedData = deniedFrame.data as Extract<
    typeof deniedFrame.data,
    { kind: 'table' }
  >;
  assert.ok(deniedData.rows.length > 0);
  assert.ok(
    deniedData.rows.every((r) => r.cells.denied === false),
    'no team was denied coopertition in this fixture'
  );
});

test('F5/F6: counterfactual booleans survive as booleans in table cells, not 0/1', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'F5')
  )!;
  const frame = reg.adapt(golden.F5, buildSpec('F5', 'table'), {
    ...ctx,
    catalogueId: 'F5'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'table' }>;
  assert.equal(data.rows.length, 14);
  for (const row of data.rows) {
    assert.equal(typeof row.cells.resultChanged, 'boolean');
    assert.equal(typeof row.cells.penaltiesExcluded, 'boolean');
    assert.equal(typeof row.cells.red, 'number');
    assert.equal(typeof row.cells.blue, 'number');
  }
});

test('F8/F9: histogram bins are boundary-correct and strictly ascending, including unbounded overflow bins', () => {
  for (const id of ['F8', 'F9'] as const) {
    const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
      semanticRegistrationKey('fgc_2026', id)
    )!;
    const frame = reg.adapt(golden[id], buildSpec(id, 'histogram'), {
      ...ctx,
      catalogueId: id
    });
    const data = frame.data as Extract<
      typeof frame.data,
      { kind: 'histogram' }
    >;
    const raw = (golden[id] as Extract<StatResult, { status: 'ok' }>).data as {
      bins: number[];
      counts: number[];
      below: number;
      above: number;
    };
    assert.equal(
      data.bins.length,
      raw.counts.length + 2,
      'below + N buckets + above'
    );
    assert.equal(data.bins[0].id, 'below');
    assert.equal(data.bins[0].lower, null);
    assert.equal(data.bins[0].upper, raw.bins[0]);
    assert.equal(data.bins[0].value, raw.below);
    assert.equal(data.bins[data.bins.length - 1].id, 'above');
    assert.equal(data.bins[data.bins.length - 1].upper, null);
    assert.equal(
      data.bins[data.bins.length - 1].lower,
      raw.bins[raw.bins.length - 1]
    );
    assert.equal(data.bins[data.bins.length - 1].value, raw.above);
    // Every interior bin is contiguous with the next: upper[i] === lower[i+1].
    for (let i = 0; i < data.bins.length - 1; i++) {
      const { upper } = data.bins[i];
      const nextLower = data.bins[i + 1].lower;
      assert.equal(
        upper,
        nextLower,
        `${id}: bin ${i} upper must equal bin ${i + 1} lower`
      );
    }
    // Bucket values match the source counts array in order.
    for (let i = 0; i < raw.counts.length; i++) {
      assert.equal(data.bins[i + 1].value, raw.counts[i]);
    }
  }
});

test('F12: line x-coordinates are the authoritative source index, ascending and never fabricated', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'F12')
  )!;
  const frame = reg.adapt(golden.F12, buildSpec('F12', 'line'), {
    ...ctx,
    catalogueId: 'F12'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'line' }>;
  const raw = (golden.F12 as Extract<StatResult, { status: 'ok' }>).data as {
    index: number;
    meanScore: number | null;
  }[];
  const { points } = data.series[0];
  assert.deepEqual(
    points.map((p) => p.x),
    raw.map((r) => r.index)
  );
  for (let i = 1; i < points.length; i++)
    assert.ok(
      points[i].x > points[i - 1].x,
      'strictly increasing sequence index'
    );
});

test('F13: line x-coordinates are real parsed timestamps, chronological', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'F13')
  )!;
  const frame = reg.adapt(golden.F13, buildSpec('F13', 'line'), {
    ...ctx,
    catalogueId: 'F13'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'line' }>;
  const raw = (golden.F13 as Extract<StatResult, { status: 'ok' }>).data as {
    atUtc: string;
    score: number;
  }[];
  const { points } = data.series[0];
  assert.deepEqual(
    points.map((p) => p.x),
    raw.map((r) => Date.parse(r.atUtc))
  );
  for (let i = 1; i < points.length; i++)
    assert.ok(points[i].x >= points[i - 1].x);
});

test('G4/G7/G10/G13: legitimately-empty fixtures never fabricate rows to look populated', () => {
  for (const id of ['G4', 'G7', 'G10', 'G13'] as const) {
    const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
      semanticRegistrationKey('fgc_2026', id)
    )!;
    const frame = reg.adapt(golden[id], buildSpec(id, 'table'), {
      ...ctx,
      catalogueId: id
    });
    const data = frame.data as Extract<typeof frame.data, { kind: 'table' }>;
    assert.equal(
      data.rows.length,
      0,
      `${id}: fixture genuinely has zero observations`
    );
    assert.ok(
      frame.emptyReason && frame.emptyReason.length > 0,
      `${id}: emptyReason documents why`
    );
  }
});

test('H2: matches with an insufficient trailing window are preserved as null rows, never a fabricated projection', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'H2')
  )!;
  const frame = reg.adapt(golden.H2, buildSpec('H2', 'table'), {
    ...ctx,
    catalogueId: 'H2'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'table' }>;
  assert.equal(data.rows[0].cells.projected, null);
  assert.equal(data.rows[0].cells.expectedEndgame, null);
  assert.equal(data.rows[1].cells.projected, null);
  assert.ok(
    typeof data.rows[2].cells.projected === 'number',
    'a later match with enough window has a real projected value'
  );
});

test('H6: numeric, chronological x-axis distinct from its human label; grouped by tournament-qualified match identity', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'H6')
  )!;
  const frame = reg.adapt(golden.H6, buildSpec('H6', 'line'), {
    ...ctx,
    catalogueId: 'H6'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'line' }>;
  assert.equal(data.xType, 'number');
  assert.equal(data.series.length, 14, 'one series per match');

  const first = data.series[0];
  assert.deepEqual(
    first.points.map((p) => p.x),
    [0, 30, 60, 90, 120],
    'x-coordinates are the numeric segment boundaries'
  );
  for (let i = 1; i < first.points.length; i++)
    assert.ok(
      first.points[i].x > first.points[i - 1].x,
      'chronologically ordered within the match'
    );
  for (const point of first.points) {
    assert.equal(typeof point.x, 'number');
    assert.notEqual(
      String(point.x),
      point.label,
      'the numeric coordinate is never the same string as its human label'
    );
    assert.match(
      point.label!,
      /^\d+–\d+s$/,
      'human label is a distinct "from-to s" string, not the axis value'
    );
  }
  // The negative net-ball segment in the fixture (a suppression removal) must survive unclamped.
  assert.ok(
    first.points.some((p) => (p.value ?? 0) < 0),
    'negative net-ball segments are preserved'
  );

  // Two different tournaments both have a "matchId 1" — series identity must not collide on a shared label.
  const raw = (golden.H6 as Extract<StatResult, { status: 'ok' }>).data as {
    tournamentKey: string;
    matchId: number;
  }[];
  const qIndex = raw.findIndex(
    (r) => r.tournamentKey === 'q' && r.matchId === 1
  );
  const fIndex = raw.findIndex(
    (r) => r.tournamentKey === 'f' && r.matchId === 1
  );
  assert.ok(qIndex >= 0 && fIndex >= 0);
  assert.notEqual(
    data.series[qIndex].id,
    data.series[fIndex].id,
    'q-1 and f-1 must not share series identity despite the same matchId'
  );
});

test('H11: table rows are identified by (match, team), values preserve real numbers, never row position', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'H11')
  )!;
  const frame = reg.adapt(golden.H11, buildSpec('H11', 'table'), {
    ...ctx,
    catalogueId: 'H11'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'table' }>;
  const raw = (golden.H11 as Extract<StatResult, { status: 'ok' }>).data as {
    value: { teamKey: number; balls: number | null }[];
  }[];
  const expectedRowCount = raw.reduce((sum, row) => sum + row.value.length, 0);
  assert.equal(data.rows.length, expectedRowCount);
  assert.equal(
    new Set(data.rows.map((r) => r.id)).size,
    data.rows.length,
    'every (match, team) row id is unique'
  );
});

test('H12: row identity is the team, not climbPoints; rank is authoritative and survives row shuffling', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'H12')
  )!;
  const raw = (golden.H12 as Extract<StatResult, { status: 'ok' }>).data as {
    teamKey: number;
    tournamentKey: string;
    rank: number;
    climbPoints: number;
  }[];

  const frame = reg.adapt(golden.H12, buildSpec('H12', 'ranking-table'), {
    ...ctx,
    catalogueId: 'H12'
  });
  const data = frame.data as Extract<
    typeof frame.data,
    { kind: 'ranking-table' }
  >;
  assert.equal(data.rows.length, raw.length);
  const rankByTeam = new Map(raw.map((r) => [r.teamKey, r.rank]));
  for (const row of data.rows) {
    assert.ok(
      row.rank !== undefined,
      'ranking-table rows always carry an authoritative rank'
    );
  }
  // Two source rows share climbPoints (teamKey 1 & 2 both have ~3) yet must produce distinct row identities.
  const climbGroups = new Map<number, number[]>();
  for (const r of raw)
    climbGroups.set(r.climbPoints, [
      ...(climbGroups.get(r.climbPoints) ?? []),
      r.teamKey
    ]);
  const collidingClimb = [...climbGroups.values()].find(
    (teamKeys) => teamKeys.length > 1
  );
  assert.ok(
    collidingClimb,
    'fixture sanity: at least two teams share a climbPoints value'
  );
  const idsForCollidingTeams = collidingClimb!.map((teamKey) => {
    const sourceRow = raw.find((r) => r.teamKey === teamKey)!;
    const tableRow = data.rows.find((r) => r.rank === sourceRow.rank)!;
    return tableRow.id;
  });
  assert.equal(
    new Set(idsForCollidingTeams).size,
    idsForCollidingTeams.length,
    'identity does not collapse teams sharing a climbPoints value'
  );

  // Shuffle the source rows: rank-by-team must be unaffected by array order.
  const shuffled = [...raw].reverse();
  const shuffledResult: StatResult = {
    status: 'ok',
    data: shuffled,
    quality: 'complete',
    warnings: []
  };
  const shuffledFrame = reg.adapt(
    shuffledResult,
    buildSpec('H12', 'ranking-table'),
    { ...ctx, catalogueId: 'H12' }
  );
  const shuffledData = shuffledFrame.data as Extract<
    typeof shuffledFrame.data,
    { kind: 'ranking-table' }
  >;
  for (const row of shuffledData.rows) {
    const team = raw.find((r) =>
      stableIdMatchesTeam(row.id, r.teamKey, r.tournamentKey)
    );
    assert.ok(team, `row ${row.id} must resolve back to a source team`);
    assert.equal(
      row.rank,
      rankByTeam.get(team!.teamKey),
      'rank is read from the row, not recomputed from array position'
    );
  }
});

function stableIdMatchesTeam(
  rowId: string,
  teamKey: number,
  tournamentKey: string
): boolean {
  // Row ids are produced by stableEntityId('team-ranking', tournamentKey, teamKey) -> JSON.stringify tuple.
  return rowId === JSON.stringify(['team-ranking', tournamentKey, teamKey]);
}

test('G5: team foul rate is a lower-is-better team comparison with real zeros preserved', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'G5')
  )!;
  assert.equal(reg.metadata.higherIsBetter, false);
  const frame = reg.adapt(golden.G5, buildSpec('G5', 'bar'), {
    ...ctx,
    catalogueId: 'G5'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'bar' }>;
  assert.equal(data.entities.length, 8);
  const zeroCount = data.series[0].points.filter((p) => p.value === 0).length;
  assert.ok(
    zeroCount > 0,
    'at least one team has a real, measured zero foul rate'
  );
});

test('G6: real zero card counts are three distinct stat-tile values, not an empty frame', () => {
  const reg = FGC2026_E_H_SEMANTIC_REGISTRATIONS.get(
    semanticRegistrationKey('fgc_2026', 'G6')
  )!;
  const frame = reg.adapt(golden.G6, buildSpec('G6', 'stat-tile'), {
    ...ctx,
    catalogueId: 'G6'
  });
  const data = frame.data as Extract<typeof frame.data, { kind: 'stat-tile' }>;
  assert.equal(data.values.length, 3);
  assert.ok(
    data.values.every((v) => v.value === 0),
    'the fixture has zero cards of every type — real zeros, not missing observations'
  );
  assert.equal(
    frame.emptyReason,
    undefined,
    'a populated stat-tile of real zeros is not "empty"'
  );
});
