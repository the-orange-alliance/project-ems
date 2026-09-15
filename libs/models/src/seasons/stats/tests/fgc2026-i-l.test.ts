/**
 * Semantic fixture assertions for every FGC2026 catalogue id I1-I10 /
 * J1-J15 / K1-K13 / L1-L14 (52 ids), exercised against the real golden
 * `StatResult` for each id (see `./golden.json`, produced by `contracts.test.ts`).
 *
 * Every expectation is derived from the golden row itself (never a
 * hand-transcribed magic number) so the test stays correct if the golden
 * fixture is regenerated with the same shape.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogue } from '../catalogue.js';
import type {
  GraphicSpec,
  GraphicKind,
  PresentationData
} from '../../../base/Graphics.js';
import {
  FGC2026_COUNTRY_METADATA,
  FGC2026_I_L_REGISTRATIONS,
  FGC2026_I_L_REGISTRATIONS_BY_KEY,
  resolveFgc2026Country
} from '../presentation/fgc2026-i-l.js';
import {
  matchEntity,
  semanticRegistrationKey,
  teamEntity,
  SemanticPreparationError,
  type SemanticRegistration
} from '../presentation/semantic-helpers.js';
import type { AdaptContext } from '../presentation/adapt-context.js';
import type { StatResult } from '../types.js';

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
const ctx: AdaptContext = {
  catalogueId: 'TEST',
  asOfUtc: '2026-09-09T12:00:00.000Z',
  teams,
  matches: []
};

const byId = new Map(FGC2026_I_L_REGISTRATIONS.map((r) => [r.catalogueId, r]));
function reg(id: string): SemanticRegistration {
  const r = byId.get(id);
  if (!r) throw new Error(`No registration for ${id}`);
  return r;
}
function buildSpec(
  r: SemanticRegistration,
  kind: GraphicKind = r.metadata.defaultKind
): GraphicSpec {
  return {
    id: `test-${r.catalogueId}`,
    title: r.catalogueId,
    stat: r.catalogueId,
    selectors: {},
    filters: {},
    params: {},
    kind,
    mode: 'fullscreen',
    options: {}
  };
}
type Bar = Extract<PresentationData, { kind: 'bar' | 'grouped-bar' }>;
type Table = Extract<PresentationData, { kind: 'table' | 'ranking-table' }>;
type StatTile = Extract<PresentationData, { kind: 'stat-tile' }>;
type GeoMap = Extract<PresentationData, { kind: 'geo-map' }>;
type Heatmap = Extract<PresentationData, { kind: 'heatmap' }>;

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

const catalogueILIds = catalogue
  .filter((c) => /^[IJKL]\d+$/.test(c.catalogueId))
  .map((c) => c.catalogueId);

test('every I/J/K/L catalogue id (52 total) has exactly one registration, keyed for fgc_2026', () => {
  assert.equal(catalogueILIds.length, 52);
  assert.equal(FGC2026_I_L_REGISTRATIONS.length, 52);
  assert.deepEqual([...byId.keys()].sort(), [...catalogueILIds].sort());
  for (const r of FGC2026_I_L_REGISTRATIONS) {
    assert.equal(r.seasonKey, 'fgc_2026');
    assert.equal(
      FGC2026_I_L_REGISTRATIONS_BY_KEY.get(
        semanticRegistrationKey(r.seasonKey, r.catalogueId)
      ),
      r
    );
  }
});

// ---------------------------------------------------------------------------
// Country metadata contract
// ---------------------------------------------------------------------------

test('the country metadata contract exposes validated ISO-3166 alpha-2 codes and names', () => {
  assert.ok(FGC2026_COUNTRY_METADATA.length > 200);
  for (const entry of FGC2026_COUNTRY_METADATA) {
    assert.match(entry.code, /^[A-Z]{2}$/);
    assert.ok(entry.name.length > 0);
  }
  assert.deepEqual(resolveFgc2026Country('United States', 'US'), {
    code: 'US',
    name: 'United States'
  });
  assert.deepEqual(resolveFgc2026Country(null, 'CA'), {
    code: 'CA',
    name: 'Canada'
  });
  assert.deepEqual(resolveFgc2026Country('Canada', null), {
    code: 'CA',
    name: 'Canada'
  });
  assert.equal(resolveFgc2026Country('Nowhereland', 'ZZ'), null);
  assert.equal(resolveFgc2026Country(null, null), null);
});

// ---------------------------------------------------------------------------
// I1-I10
// ---------------------------------------------------------------------------

for (const id of ['I1', 'I3', 'I4', 'I5', 'I6', 'I9']) {
  test(`${id} preserves per-match identity and real null observations (never a fabricated zero)`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const rows = raw.data as {
      tournamentKey: string;
      matchId: number;
      value: number | null;
    }[];
    const barFrame = r.adapt(golden[id], buildSpec(r, 'bar'), ctx);
    const bar = barFrame.data as Bar;
    assert.equal(bar.entities.length, rows.length);
    assert.deepEqual(
      bar.series[0].points.map((p) => p.value),
      rows.map((row) => row.value)
    );
    assert.deepEqual(
      bar.entities.map((e) => e.id),
      rows.map((row) => matchEntity(row.tournamentKey, row.matchId, ctx).id)
    );
    if (rows.some((row) => row.value === null)) {
      const nullIndex = rows.findIndex((row) => row.value === null);
      assert.equal(bar.series[0].points[nullIndex].value, null);
    }
    const tableFrame = r.adapt(golden[id], buildSpec(r, 'table'), ctx);
    const table = tableFrame.data as Table;
    assert.equal(table.rows.length, rows.length);
    assert.deepEqual(
      table.rows.map((row) => row.cells.value),
      rows.map((row) => row.value)
    );
  });
}

test('I2 preserves the rolling-average scalar with full precision', () => {
  const r = reg('I2');
  const raw = golden.I2 as Extract<StatResult, { status: 'ok' }>;
  const frame = r.adapt(golden.I2, buildSpec(r), ctx);
  const tile = frame.data as StatTile;
  assert.equal(tile.values[0].value, raw.data);
});

test('I7 preserves played and remaining as real integers, including a legitimate 0', () => {
  const r = reg('I7');
  const raw = golden.I7 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as { played: number; remaining: number };
  const frame = r.adapt(golden.I7, buildSpec(r), ctx);
  const tile = frame.data as StatTile;
  assert.equal(tile.values.find((v) => v.id === 'played')?.value, obj.played);
  assert.equal(
    tile.values.find((v) => v.id === 'remaining')?.value,
    obj.remaining
  );
  assert.equal(obj.remaining, 0);
});

test('I8 keeps each field as its own stable identity with its own mean score and match count', () => {
  const r = reg('I8');
  const raw = golden.I8 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    fieldNumber: number;
    meanScore: number | null;
    matches: number;
  }[];
  const frame = r.adapt(golden.I8, buildSpec(r, 'bar'), ctx);
  const bar = frame.data as Bar;
  assert.equal(bar.entities.length, rows.length);
  assert.deepEqual(
    bar.series[0].points.map((p) => p.value),
    rows.map((row) => row.meanScore)
  );
  const tableFrame = r.adapt(golden.I8, buildSpec(r, 'table'), ctx);
  const table = tableFrame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.matches),
    rows.map((row) => row.matches)
  );
});

test('I10 preserves the event-wide throughput scalar', () => {
  const r = reg('I10');
  const raw = golden.I10 as Extract<StatResult, { status: 'ok' }>;
  const frame = r.adapt(golden.I10, buildSpec(r), ctx);
  const tile = frame.data as StatTile;
  assert.equal(tile.values[0].value, raw.data);
});

// ---------------------------------------------------------------------------
// J1-J15
// ---------------------------------------------------------------------------

test('J1 (defect fix) preserves real country strings in a team table AND a distinct country-level aggregation', () => {
  const r = reg('J1');
  const raw = golden.J1 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    teamKey: number;
    country: string | null;
    countryCode: string | null;
  }[];
  const tableFrame = r.adapt(golden.J1, buildSpec(r, 'table'), ctx);
  const table = tableFrame.data as Table;
  assert.equal(table.rows.length, rows.length);
  assert.deepEqual(
    table.rows.map((row) => row.cells.country),
    rows.map((row) => row.country)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.countryCode),
    rows.map((row) => row.countryCode)
  );
  assert.deepEqual(
    table.rows.map((row) => row.id),
    rows.map((row) => teamEntity(row.teamKey, ctx).id)
  );

  const geoFrame = r.adapt(golden.J1, buildSpec(r, 'geo-map'), ctx);
  const geo = geoFrame.data as GeoMap;
  const expectedCodes = new Set(
    rows.map((row) => row.countryCode).filter((c): c is string => c !== null)
  );
  assert.deepEqual(
    new Set(geo.countries.map((c) => c.countryCode)),
    expectedCodes
  );
  const usCount = rows.filter((row) => row.countryCode === 'US').length;
  assert.equal(
    geo.countries.find((c) => c.countryCode === 'US')?.value,
    usCount
  );
  assert.equal(geo.unknownCountryCodes.length, 0);
});

test('J2 (defect fix) preserves robotName text instead of dropping it for being non-numeric', () => {
  const r = reg('J2');
  const raw = golden.J2 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as { teamKey: number; robotName: string | null }[];
  const frame = r.adapt(golden.J2, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.robotName),
    rows.map((row) => row.robotName)
  );
  assert.ok(table.rows.every((row) => typeof row.cells.robotName === 'string'));
});

test('J3 preserves the boolean rookie flag verbatim (true/false/null, never coerced)', () => {
  const r = reg('J3');
  const raw = golden.J3 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as { teamKey: number; rookie: boolean | null }[];
  const frame = r.adapt(golden.J3, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.rookie),
    rows.map((row) => row.rookie)
  );
});

test('J4 (defect fix) identity is the team, and the authoritative source rank is preserved verbatim', () => {
  const r = reg('J4');
  const raw = golden.J4 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as {
    teamKey: number;
    rank: number;
    rankingScore: number;
    highestScore: number;
    climbPoints: number;
    rankChange: number;
    played: number;
  };
  const frame = r.adapt(golden.J4, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].id, teamEntity(obj.teamKey, ctx).id);
  assert.equal(table.rows[0].rank, obj.rank);
  assert.equal(table.rows[0].cells.rankingScore, obj.rankingScore);
  assert.equal(table.rows[0].cells.climbPoints, obj.climbPoints);
});

test('J5 preserves the debuting team identity, real first-match identity and score together', () => {
  const r = reg('J5');
  const raw = golden.J5 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as {
    teamKey: number;
    tournamentKey: string;
    matchId: number;
    score: number;
  };
  const frame = r.adapt(golden.J5, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows[0].id, teamEntity(obj.teamKey, ctx).id);
  assert.equal(table.rows[0].cells.score, obj.score);
  assert.equal(
    table.rows[0].cells.match,
    matchEntity(obj.tournamentKey, obj.matchId, ctx).label
  );
});

test('J6 keeps country and continent as two distinct, never-flattened presentations', () => {
  const r = reg('J6');
  const raw = golden.J6 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as {
    countries: { country: string; meanRankingScore: number | null }[];
    continents: { continent: string; meanRankingScore: number | null }[];
  };
  const countryFrame = r.adapt(golden.J6, buildSpec(r, 'bar'), ctx);
  const countryBar = countryFrame.data as Bar;
  assert.equal(countryBar.entities.length, obj.countries.length);
  assert.deepEqual(
    countryBar.entities.map((e) => e.label),
    obj.countries.map((c) => c.country)
  );
  assert.deepEqual(
    countryBar.series[0].points.map((p) => p.value),
    obj.countries.map((c) => c.meanRankingScore)
  );

  const continentFrame = r.adapt(golden.J6, buildSpec(r, 'table'), ctx);
  const continentTable = continentFrame.data as Table;
  assert.equal(continentTable.rows.length, obj.continents.length);
  assert.deepEqual(
    continentTable.rows.map((row) => row.label),
    obj.continents.map((c) => c.continent)
  );
  assert.deepEqual(
    continentTable.rows.map((row) => row.cells.meanRankingScore),
    obj.continents.map((c) => c.meanRankingScore)
  );
  // The two concepts never share an entity domain: no continent label appears among the country entities and vice versa.
  const countryLabels = new Set(countryBar.entities.map((e) => e.label));
  for (const row of continentTable.rows)
    assert.equal(countryLabels.has(row.label), false);
});

test('J7 preserves both real country names in the matchup alongside win/loss/tie counts', () => {
  const r = reg('J7');
  const raw = golden.J7 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as {
    countries: string[];
    wins: number;
    losses: number;
    ties: number;
  };
  const frame = r.adapt(golden.J7, buildSpec(r), ctx);
  const tile = frame.data as StatTile;
  assert.equal(
    tile.values.find((v) => v.id === 'matchup')?.value,
    obj.countries.join(' vs ')
  );
  assert.equal(tile.values.find((v) => v.id === 'wins')?.value, obj.wins);
  assert.equal(tile.values.find((v) => v.id === 'losses')?.value, obj.losses);
  assert.equal(tile.values.find((v) => v.id === 'ties')?.value, obj.ties);
});

for (const [id, label] of [
  ['J8', 'Never climbed'],
  ['J9', '100% climb rate']
] as const) {
  test(`${id} preserves every real team in the roster by identity, not just a count`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const teamKeys = (raw.data as { teamKey: number }[]).map(
      (row) => row.teamKey
    );
    const frame = r.adapt(golden[id], buildSpec(r), ctx);
    const table = frame.data as Table;
    assert.deepEqual(
      table.rows.map((row) => row.id),
      teamKeys.map((k) => teamEntity(k, ctx).id)
    );
    assert.equal(table.columns[0].label, label);
  });
}

test('J10 preserves the most-improved team identity and a possibly-null slope', () => {
  const r = reg('J10');
  const raw = golden.J10 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as { teamKey: number; slope: number | null };
  const frame = r.adapt(golden.J10, buildSpec(r), ctx);
  const tile = frame.data as StatTile;
  assert.equal(
    tile.values.find((v) => v.id === 'team')?.value,
    teamEntity(obj.teamKey, ctx).label
  );
  assert.equal(tile.values.find((v) => v.id === 'slope')?.value, obj.slope);
});

test('J11 preserves every (team, partner) pair individually with its real shared-match count', () => {
  const r = reg('J11');
  const raw = golden.J11 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    teamKey: number;
    partners: { teamKey: number; count: number }[];
  }[];
  const expectedPairCount = rows.reduce(
    (sum, row) => sum + row.partners.length,
    0
  );
  const frame = r.adapt(golden.J11, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, expectedPairCount);
  const firstRow = rows[0];
  const firstPartner = firstRow.partners[0];
  const matching = table.rows.find(
    (row) =>
      row.cells.team === teamEntity(firstRow.teamKey, ctx).label &&
      row.cells.partner === teamEntity(firstPartner.teamKey, ctx).label
  );
  assert.equal(matching?.cells.count, firstPartner.count);
});

test('J12 is legitimately empty in this fixture (every team already shares a match with every other), not a source failure', () => {
  const r = reg('J12');
  const raw = golden.J12 as Extract<StatResult, { status: 'ok' }>;
  assert.deepEqual(raw.data, []);
  assert.equal(r.manifest.fixtureExpectation, 'legitimately-empty');
  const frame = r.adapt(golden.J12, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, 0);
  assert.ok(frame.emptyReason && frame.emptyReason.length > 0);
});

test("J13 preserves each team's best and worst match name and score together, with real nulls for missing matches", () => {
  const r = reg('J13');
  const raw = golden.J13 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    teamKey: number;
    best: { name: string; score: number } | null;
    worst: { name: string; score: number } | null;
  }[];
  const frame = r.adapt(golden.J13, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.bestScore),
    rows.map((row) => row.best?.score ?? null)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.bestMatch),
    rows.map((row) => row.best?.name ?? null)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.worstScore),
    rows.map((row) => row.worst?.score ?? null)
  );
});

test('J14 preserves every real win count, including a legitimate 0', () => {
  const r = reg('J14');
  const raw = golden.J14 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as { teamKey: number; wins: number }[];
  assert.ok(rows.some((row) => row.wins === 0));
  const frame = r.adapt(golden.J14, buildSpec(r, 'bar'), ctx);
  const bar = frame.data as Bar;
  assert.deepEqual(
    bar.series[0].points.map((p) => p.value),
    rows.map((row) => row.wins)
  );
});

test('J15 preserves all three geographic facts (team, country, latitude, area) as a fact table, never coerced into a geo-map', () => {
  const r = reg('J15');
  const raw = golden.J15 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as Record<
    'northernmost' | 'southernmost' | 'smallestNation',
    { teamKey: number; country: string; latitude: number; area: number }
  >;
  assert.equal(r.metadata.defaultKind, 'table');
  assert.deepEqual(r.metadata.supportedKinds, ['table']);
  const frame = r.adapt(golden.J15, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, 3);
  for (const [fact, expected] of Object.entries(obj) as [
    string,
    { teamKey: number; country: string; latitude: number; area: number }
  ][]) {
    const row = table.rows.find(
      (candidate) => candidate.id === `["fact","${fact}"]`
    );
    assert.ok(row, `missing row for ${fact}`);
    assert.equal(row!.cells.team, teamEntity(expected.teamKey, ctx).label);
    assert.equal(row!.cells.country, expected.country);
    assert.equal(row!.cells.latitude, expected.latitude);
    assert.equal(row!.cells.area, expected.area);
  }
});

// ---------------------------------------------------------------------------
// K1-K13
// ---------------------------------------------------------------------------

for (const id of ['K1', 'K2', 'K3', 'K11']) {
  test(`${id} preserves tournament-qualified alliance identity and real nulls`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const rows = raw.data as {
      tournamentKey: string;
      allianceSeed: number;
      value: number | null;
    }[];
    const frame = r.adapt(golden[id], buildSpec(r, 'bar'), ctx);
    const bar = frame.data as Bar;
    assert.equal(bar.entities.length, rows.length);
    assert.deepEqual(
      bar.series[0].points.map((p) => p.value),
      rows.map((row) => row.value)
    );
    assert.deepEqual(
      bar.entities.map((e) => e.label),
      rows.map((row) => `Seed ${row.allianceSeed} · ${row.tournamentKey}`)
    );
  });
}

test('K4 carries the authoritative alliance rank verbatim (never derived from array position)', () => {
  const r = reg('K4');
  const raw = golden.K4 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    allianceSeed: number;
    value: { seed: number; rank: number; delta: number };
  }[];
  const frame = r.adapt(golden.K4, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.rank),
    rows.map((row) => row.value.rank)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.delta),
    rows.map((row) => row.value.delta)
  );
});

test('K5 preserves real per-team appearance counts and folds which-teams-played-each-match into readable notes', () => {
  const r = reg('K5');
  const raw = golden.K5 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    allianceSeed: number;
    value: {
      appearances: { teamKey: number; count: number }[];
      matches: unknown[];
    } | null;
  }[];
  const withData = rows.filter((row) => row.value !== null);
  const expectedRowCount = withData.reduce(
    (sum, row) => sum + row.value!.appearances.length,
    0
  );
  const frame = r.adapt(golden.K5, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, expectedRowCount);
  const first = withData[0];
  const firstAppearance = first.value!.appearances[0];
  const matching = table.rows.find(
    (row) =>
      row.id ===
      `["alliance-team","${first.tournamentKey}",${first.allianceSeed},${firstAppearance.teamKey}]`
  );
  assert.equal(matching?.cells.count, firstAppearance.count);
  assert.ok(frame.notes && frame.notes.length > 0);
});

test('K6 preserves real per-team sit-out counts and documents alliances with no rotation data instead of fabricating rows', () => {
  const r = reg('K6');
  const raw = golden.K6 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    allianceSeed: number;
    value: { teamKey: number; sitOut: number }[] | null;
  }[];
  const withData = rows.filter((row) => row.value !== null);
  const withoutData = rows.filter((row) => row.value === null);
  const expectedRowCount = withData.reduce(
    (sum, row) => sum + row.value!.length,
    0
  );
  const frame = r.adapt(golden.K6, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, expectedRowCount);
  if (withoutData.length > 0)
    assert.ok(frame.notes && frame.notes.length >= withoutData.length);
});

test('K7 preserves withDrawn/withoutDrawn means per alliance, either of which may be a real null', () => {
  const r = reg('K7');
  const raw = golden.K7 as Extract<StatResult, { status: 'ok' }>;
  const rows = (
    raw.data as {
      tournamentKey: string;
      allianceSeed: number;
      value: {
        withDrawn: number | null;
        withoutDrawn: number | null;
        delta: number;
      } | null;
    }[]
  ).filter((row) => row.value !== null);
  const frame = r.adapt(golden.K7, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, rows.length);
  assert.deepEqual(
    table.rows.map((row) => row.cells.withDrawn),
    rows.map((row) => row.value!.withDrawn)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.delta),
    rows.map((row) => row.value!.delta)
  );
});

test("K8 identity is the captain's own team, and the authoritative playoff rank is preserved verbatim", () => {
  const r = reg('K8');
  const raw = golden.K8 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    allianceSeed: number;
    value: {
      captain: number;
      qualificationRankingScore: number;
      playoffTotal: number;
      playoffRank: number;
    };
  }[];
  const frame = r.adapt(golden.K8, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.label),
    rows.map((row) => teamEntity(row.value.captain, ctx).label)
  );
  assert.deepEqual(
    table.rows.map((row) => row.rank),
    rows.map((row) => row.value.playoffRank)
  );
});

test('K9 (source failure in this fixture) surfaces the real reason via requireOkResult rather than a fabricated empty table', () => {
  const r = reg('K9');
  assert.equal(golden.K9.status, 'unavailable');
  assert.equal(r.manifest.fixtureExpectation, 'source-failure');
  assert.throws(
    () => r.adapt(golden.K9, buildSpec(r), ctx),
    (err: unknown) => {
      assert.ok(err instanceof SemanticPreparationError);
      assert.equal(err.sourceStatus, 'unavailable');
      assert.match(
        err.message,
        /Required captured data or sufficient samples are absent/
      );
      return true;
    }
  );
});

test('K10 preserves tournament-qualified match identity and a real null alliance seed before playoffs assign one', () => {
  const r = reg('K10');
  const raw = golden.K10 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    matchId: number;
    redScore: number;
    blueScore: number;
    redAlliance: number | null;
    blueAlliance: number | null;
  }[];
  const frame = r.adapt(golden.K10, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, rows.length);
  assert.deepEqual(
    table.rows.map((row) => row.id),
    rows.map((row) => matchEntity(row.tournamentKey, row.matchId, ctx).id)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.redAlliance),
    rows.map((row) => row.redAlliance)
  );
  assert.ok(rows.some((row) => row.redAlliance === null));
});

test('K12 (source failure in this fixture) surfaces the real reason rather than a fabricated result', () => {
  const r = reg('K12');
  assert.equal(golden.K12.status, 'unavailable');
  assert.equal(r.manifest.fixtureExpectation, 'source-failure');
  assert.throws(
    () => r.adapt(golden.K12, buildSpec(r), ctx),
    SemanticPreparationError
  );
});

test("K13 preserves each alliance's tournament-qualified identity, advancement probability and sample count", () => {
  const r = reg('K13');
  const raw = golden.K13 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    allianceSeed: number;
    advancementProbability: number;
    samples: number;
  }[];
  const frame = r.adapt(golden.K13, buildSpec(r, 'bar'), ctx);
  const bar = frame.data as Bar;
  assert.deepEqual(
    bar.series[0].points.map((p) => p.value),
    rows.map((row) => row.advancementProbability)
  );
  const tableFrame = r.adapt(golden.K13, buildSpec(r, 'table'), ctx);
  const table = tableFrame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.samples),
    rows.map((row) => row.samples)
  );
});

// ---------------------------------------------------------------------------
// L1-L14
// ---------------------------------------------------------------------------

test('L1 preserves every term of the margin decomposition per match', () => {
  const r = reg('L1');
  const raw = golden.L1 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    matchId: number;
    value: { margin: number; suppressionMultiplier: number };
  }[];
  const frame = r.adapt(golden.L1, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.margin),
    rows.map((row) => row.value.margin)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.suppressionMultiplier),
    rows.map((row) => row.value.suppressionMultiplier)
  );
});

test('L2 preserves the explanatory penalty-caveat text verbatim per match', () => {
  const r = reg('L2');
  const raw = golden.L2 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    matchId: number;
    value: { penaltyCaveat: string; shared: number };
  }[];
  const frame = r.adapt(golden.L2, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.penaltyCaveat),
    rows.map((row) => row.value.penaltyCaveat)
  );
  assert.ok(
    table.rows.every(
      (row) =>
        typeof row.cells.penaltyCaveat === 'string' &&
        (row.cells.penaltyCaveat as string).length > 0
    )
  );
});

for (const id of ['L3', 'L4']) {
  test(`${id} preserves the recomputed red/blue scores and the real resultChanged boolean`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const rows = raw.data as {
      tournamentKey: string;
      matchId: number;
      value: { red: number; blue: number; resultChanged: boolean };
    }[];
    const frame = r.adapt(golden[id], buildSpec(r), ctx);
    const table = frame.data as Table;
    assert.deepEqual(
      table.rows.map((row) => row.cells.resultChanged),
      rows.map((row) => row.value.resultChanged)
    );
    assert.ok(
      table.rows.every((row) => typeof row.cells.resultChanged === 'boolean')
    );
  });
}
test('L3 exercises both a true and a false resultChanged in this fixture', () => {
  const raw = golden.L3 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as { value: { resultChanged: boolean } }[];
  assert.ok(
    rows.some((row) => row.value.resultChanged === true) &&
      rows.some((row) => row.value.resultChanged === false)
  );
});

for (const id of ['L5', 'L6']) {
  test(`${id} preserves each bucket's real boundary, win rate, match count and tie count`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const rows = raw.data as {
      bucket: number;
      winRate: number | null;
      matches: number;
      ties: number;
    }[];
    const frame = r.adapt(golden[id], buildSpec(r, 'grouped-bar'), ctx);
    const bar = frame.data as Bar;
    assert.equal(bar.entities.length, rows.length);
    assert.deepEqual(
      bar.series.find((s) => s.id === 'winRate')?.points.map((p) => p.value),
      rows.map((row) => row.winRate)
    );
    assert.deepEqual(
      bar.series.find((s) => s.id === 'matches')?.points.map((p) => p.value),
      rows.map((row) => row.matches)
    );
  });
}

test('L7 preserves the break-even zone-3 value, additional-ball count and boolean verdict per match', () => {
  const r = reg('L7');
  const raw = golden.L7 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    matchId: number;
    value: {
      zone3Value: number;
      additionalBalls: number;
      climbWorthMore: boolean;
    };
  }[];
  const frame = r.adapt(golden.L7, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.climbWorthMore),
    rows.map((row) => row.value.climbWorthMore)
  );
});

test("L8 preserves each team's currently-discarded match identity and score together", () => {
  const r = reg('L8');
  const raw = golden.L8 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    teamKey: number;
    value: { tournamentKey: string; matchId: number; score: number } | null;
  }[];
  const frame = r.adapt(golden.L8, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.score),
    rows.map((row) => row.value?.score ?? null)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.match),
    rows.map((row) =>
      row.value
        ? matchEntity(row.value.tournamentKey, row.value.matchId, ctx).label
        : null
    )
  );
});

for (const [id, field] of [
  ['L9', 'value'],
  ['L10', 'points'],
  ['L12', 'spread']
] as const) {
  test(`${id} preserves every team's real value, including nulls where the source has none`, () => {
    const r = reg(id);
    const raw = golden[id] as Extract<StatResult, { status: 'ok' }>;
    const rows = raw.data as Record<string, unknown>[];
    const expected = rows.map((row) => row[field] as number | null);
    const frame = r.adapt(golden[id], buildSpec(r, 'bar'), ctx);
    const bar = frame.data as Bar;
    assert.deepEqual(
      bar.series[0].points.map((p) => p.value),
      expected
    );
  });
}

test('L11 (defect fix) never renumbers by array position: the nested teams[].rank is authoritative', () => {
  const r = reg('L11');
  const raw = golden.L11 as Extract<StatResult, { status: 'ok' }>;
  const groups = raw.data as {
    boundary: number;
    teams: { teamKey: number; rank: number; rankingScore: number }[];
  }[];
  const flattened = groups.flatMap((g) =>
    g.teams.map((t) => ({ boundary: g.boundary, ...t }))
  );
  const frame = r.adapt(golden.L11, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.equal(table.rows.length, flattened.length);
  assert.deepEqual(
    table.rows.map((row) => row.rank),
    flattened.map((t) => t.rank)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.rankingScore),
    flattened.map((t) => t.rankingScore)
  );
  // The regression this guards against: ranks 7 and 8 must never come back as 1 and 2.
  assert.ok(
    flattened.some((t) => t.rank > 2),
    'fixture must exercise ranks beyond a fabricated 1..2 sequence'
  );
  assert.deepEqual(
    table.rows.map((row) => row.rank).sort((a, b) => a! - b!),
    flattened.map((t) => t.rank).sort((a, b) => a - b)
  );
});

test('L13 preserves every metric-pair correlation coefficient as a heatmap cell', () => {
  const r = reg('L13');
  const raw = golden.L13 as Extract<StatResult, { status: 'ok' }>;
  const obj = raw.data as { metrics: string[]; matrix: (number | null)[][] };
  const frame = r.adapt(golden.L13, buildSpec(r), ctx);
  const heatmap = frame.data as Heatmap;
  assert.equal(heatmap.xEntities.length, obj.metrics.length);
  assert.equal(heatmap.cells.length, obj.metrics.length * obj.metrics.length);
  const cellFor = (rowMetric: string, colMetric: string) =>
    heatmap.cells.find(
      (c) =>
        c.yId === `["metric","${rowMetric}"]` &&
        c.xId === `["metric","${colMetric}"]`
    )?.value;
  for (let i = 0; i < obj.metrics.length; i++) {
    for (let j = 0; j < obj.metrics.length; j++) {
      assert.equal(cellFor(obj.metrics[i], obj.metrics[j]), obj.matrix[i][j]);
    }
  }
});

test('L14 preserves the real deciding-term name and its point value per match', () => {
  const r = reg('L14');
  const raw = golden.L14 as Extract<StatResult, { status: 'ok' }>;
  const rows = raw.data as {
    tournamentKey: string;
    matchId: number;
    value: { term: string; points: number };
  }[];
  const frame = r.adapt(golden.L14, buildSpec(r), ctx);
  const table = frame.data as Table;
  assert.deepEqual(
    table.rows.map((row) => row.cells.term),
    rows.map((row) => row.value.term)
  );
  assert.deepEqual(
    table.rows.map((row) => row.cells.points),
    rows.map((row) => row.value.points)
  );
});
