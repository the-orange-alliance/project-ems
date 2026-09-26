/**
 * Fixture assertions for the FGC2026 A-D semantic presentation
 * registrations (`../presentation/fgc2026-a-d.ts`). Uses the same real,
 * deterministically-computed golden results as `presentation.test.ts`, but
 * asserts actual semantic content per id (not just "schema valid").
 *
 * Placed under seasons/stats/tests (not presentation/) because the package
 * `test` script globs only `build/seasons/stats/tests/*.test.js` — see
 * libs/models/package.json. A file under presentation/ would compile but
 * silently never run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogue } from '../catalogue.js';
import {
  FGC2026_A_D_REGISTRATIONS,
  fgc2026SemanticPresentationRegistryAD
} from '../presentation/fgc2026-a-d.js';
import {
  semanticRegistrationKey,
  SemanticPreparationError
} from '../presentation/semantic-helpers.js';
import type { AdaptContext } from '../presentation/adapt-context.js';
import type { StatResult } from '../types.js';
import {
  presentationFrameZod,
  type GraphicKind,
  type GraphicSpec,
  type PresentationData,
  type PresentationFrame
} from '../../../base/Graphics.js';

const golden: Record<string, StatResult> = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);

function goldenOk(id: string): Extract<StatResult, { status: 'ok' }> {
  const result = golden[id];
  assert.equal(result.status, 'ok', `${id}: golden fixture expected to be ok`);
  return result as Extract<StatResult, { status: 'ok' }>;
}

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

function reg(id: string) {
  const registration = fgc2026SemanticPresentationRegistryAD.get(
    semanticRegistrationKey('fgc_2026', id)
  );
  assert.ok(
    registration,
    `${id}: registration present under its season-qualified key`
  );
  return registration!;
}

function adapt(id: string, kind?: GraphicKind): PresentationFrame {
  const registration = reg(id);
  return registration.adapt(
    golden[id],
    buildSpec(id, kind ?? registration.metadata.defaultKind),
    { ...ctx, catalogueId: id }
  );
}

function asStatTile(data: PresentationData) {
  if (data.kind !== 'stat-tile')
    throw new Error(`expected stat-tile, got ${data.kind}`);
  return data;
}
function asBar(data: PresentationData) {
  if (data.kind !== 'bar' && data.kind !== 'grouped-bar')
    throw new Error(`expected bar/grouped-bar, got ${data.kind}`);
  return data;
}
function asTable(data: PresentationData) {
  if (data.kind !== 'table' && data.kind !== 'ranking-table')
    throw new Error(`expected table, got ${data.kind}`);
  return data;
}
function asLine(data: PresentationData) {
  if (data.kind !== 'line') throw new Error(`expected line, got ${data.kind}`);
  return data;
}

const AD_IDS = catalogue
  .map((row) => row.catalogueId)
  .filter((id) => /^[ABCD]\d+$/.test(id));
const SOURCE_FAILURE_IDS = new Set(['D6']);

// ---------------------------------------------------------------------------
// Coverage: every catalogue id has exactly one registration, and every
// registration (bar D6's documented source failure) adapts the real golden
// result without throwing, honestly reporting emptiness.
// ---------------------------------------------------------------------------

test('every A/B/C/D catalogue id (95) has exactly one registration', () => {
  assert.equal(
    AD_IDS.length,
    95,
    'catalogue has 95 A/B/C/D ids (A42 B22 C22 D9)'
  );
  assert.equal(FGC2026_A_D_REGISTRATIONS.length, 95);
  assert.equal(fgc2026SemanticPresentationRegistryAD.size, 95);
  for (const id of AD_IDS) {
    const registration = reg(id);
    assert.equal(registration.catalogueId, id);
    assert.equal(registration.seasonKey, 'fgc_2026');
    assert.ok(
      registration.metadata.supportedKinds.includes(
        registration.metadata.defaultKind
      ),
      `${id}: defaultKind must be one of supportedKinds`
    );
    assert.ok(
      registration.manifest.assertions.length > 0,
      `${id}: manifest documents at least one assertion`
    );
  }
});

test('every registration adapts its real golden result and validates against presentationFrameZod, reporting emptiness honestly', () => {
  for (const id of AD_IDS) {
    if (SOURCE_FAILURE_IDS.has(id)) continue;
    const registration = reg(id);
    const result = golden[id];
    assert.ok(result, `${id}: golden result present`);
    let frame: PresentationFrame | undefined;
    assert.doesNotThrow(() => {
      frame = registration.adapt(
        result,
        buildSpec(id, registration.metadata.defaultKind),
        { ...ctx, catalogueId: id }
      );
    }, `${id}: adapt threw unexpectedly`);
    assert.equal(
      frame!.kind,
      registration.metadata.defaultKind,
      `${id}: frame kind matches registration default`
    );
    const parsed = presentationFrameZod.safeParse(frame);
    assert.ok(
      parsed.success,
      `${id}: frame must validate against presentationFrameZod: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`
    );
    assert.equal(
      registration.manifest.fixtureExpectation,
      'nonempty',
      `${id}: manifest expects nonempty content on this fixture`
    );
    assert.equal(
      frame!.emptyReason,
      undefined,
      `${id}: nonempty fixture must not carry an emptyReason`
    );
  }
});

test('D6: the one documented source failure throws SemanticPreparationError with its real StatResult status, never a fabricated empty frame', () => {
  const registration = reg('D6');
  assert.equal(registration.manifest.fixtureExpectation, 'source-failure');
  assert.ok(
    registration.manifest.emptyReason &&
      registration.manifest.emptyReason.length > 0,
    'D6: manifest documents why the golden fixture fails'
  );
  assert.equal(
    golden.D6.status,
    'unavailable',
    'fixture sanity: D6 really is a source failure, not an ok empty result'
  );
  assert.throws(
    () =>
      registration.adapt(golden.D6, buildSpec('D6', 'table'), {
        ...ctx,
        catalogueId: 'D6'
      }),
    (err: unknown) => {
      assert.ok(err instanceof SemanticPreparationError);
      assert.equal(
        (err as SemanticPreparationError).sourceStatus,
        'unavailable'
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// A1-A9: OPR-family least-squares team ratings (oprTable shape).
// ---------------------------------------------------------------------------

test('A1-A9: every OPR-family team value is the exact solved rating, matrix rank surfaced as a note', () => {
  for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']) {
    const raw = goldenOk(id).data as {
      teams: { teamKey: number; value: number | null }[];
      rank: number;
      columns: number;
    };
    const frame = adapt(id, 'bar');
    const data = asBar(frame.data!);
    assert.equal(
      data.entities.length,
      raw.teams.length,
      `${id}: one entity per team`
    );
    const byTeam = new Map(raw.teams.map((t) => [t.teamKey, t.value]));
    for (const point of data.series[0].points) {
      const teamKey = JSON.parse(point.entityId)[1] as number;
      assert.equal(
        point.value,
        byTeam.get(teamKey),
        `${id}: team ${teamKey} value must match the solved OPR exactly`
      );
    }
    assert.ok(
      frame.notes?.some((n) => n.includes(`rank ${raw.rank}`)),
      `${id}: solved matrix rank surfaced as a note`
    );
  }
  assert.equal(
    reg('A6').metadata.higherIsBetter,
    false,
    'A6 DPR: lower is better (less scored against)'
  );
  assert.equal(
    reg('A7').metadata.higherIsBetter,
    true,
    'A7 CCWM: higher is better'
  );
  assert.deepEqual(
    reg('A8').metadata.requiredParams,
    ['lambda'],
    'A8 requires the ridge lambda parameter'
  );
  // A5 is rank-deficient in the golden fixture; its "best_effort" warning must survive into the frame.
  const a5 = adapt('A5', 'bar');
  assert.equal(a5.quality, 'best_effort');
  assert.ok(
    a5.warnings.some((w) => w.toLowerCase().includes('rank-deficient'))
  );
});

// ---------------------------------------------------------------------------
// Team-scoped and match-scoped single-measure ("simple") ids: every point
// must equal its exact golden row value, nulls and real zeros distinct.
// ---------------------------------------------------------------------------

const TEAM_SIMPLE_IDS = [
  'A10',
  'A12',
  'A13',
  'A22',
  'A24',
  'A25',
  'A26',
  'A28',
  'A29',
  'A31',
  'A32',
  'A33',
  'A35',
  'A37',
  'A39',
  'A40',
  'A41',
  'C4',
  'C6',
  'C7',
  'C8',
  'D3'
];

test("team-scoped single-measure ids: every team's bar value matches its golden row exactly", () => {
  for (const id of TEAM_SIMPLE_IDS) {
    const raw = goldenOk(id).data as {
      teamKey: number;
      value: number | null;
    }[];
    const data = asBar(adapt(id, 'bar').data!);
    assert.equal(
      data.entities.length,
      raw.length,
      `${id}: one entity per team row`
    );
    const byTeam = new Map(raw.map((r) => [r.teamKey, r.value]));
    for (const point of data.series[0].points) {
      const teamKey = JSON.parse(point.entityId)[1] as number;
      assert.equal(
        point.value,
        byTeam.get(teamKey),
        `${id}: team ${teamKey} value mismatch`
      );
    }
  }
});

const MATCH_SIMPLE_IDS = [
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
  'B9',
  'B10',
  'B11',
  'B12',
  'B15',
  'B18',
  'B20',
  'C2',
  'C3',
  'C14',
  'C15',
  'C17',
  'C18',
  'D1',
  'D2',
  'D7'
];

test("match-scoped single-measure ids: every match's bar value matches its golden row exactly, in tournament-qualified identity order", () => {
  for (const id of MATCH_SIMPLE_IDS) {
    const raw = goldenOk(id).data as {
      tournamentKey: string;
      matchId: number;
      value: number | null;
    }[];
    const data = asBar(adapt(id, 'bar').data!);
    assert.equal(
      data.entities.length,
      raw.length,
      `${id}: one entity per match row`
    );
    for (let i = 0; i < raw.length; i++) {
      const expectedId = JSON.stringify([
        'match',
        raw[i].tournamentKey,
        raw[i].matchId
      ]);
      assert.equal(
        data.entities[i].id,
        expectedId,
        `${id}: row ${i} identity must be tournament-qualified`
      );
      assert.equal(
        data.series[0].points[i].value,
        raw[i].value,
        `${id}: row ${i} value mismatch`
      );
    }
  }
});

test('B8: signed suppression differential survives without clamping', () => {
  const raw = goldenOk('B8').data as { value: number | null }[];
  assert.ok(
    raw.every((r) => typeof r.value === 'number'),
    'fixture sanity: B8 always has a real numeric value'
  );
  const data = asBar(adapt('B8', 'bar').data!);
  assert.deepEqual(
    data.series[0].points.map((p) => p.value),
    raw.map((r) => r.value)
  );
});

test('B12/B15/B18/C18/A22/A31: latency-style and instability metrics are explicitly lower-is-better', () => {
  for (const id of ['B12', 'B15', 'C18', 'A22', 'A31']) {
    assert.equal(
      reg(id).metadata.higherIsBetter,
      false,
      `${id}: expected to be marked lower-is-better`
    );
  }
});

test('required alliance/team/samples parameters are surfaced as metadata, matching the authoritative parameter schema', () => {
  assert.deepEqual(reg('B1').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('B10').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('B11').metadata.requiredParams, ['windowSeconds']);
  assert.deepEqual(reg('B13').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('B14').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('C2').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('C9').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('D1').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('D6').metadata.requiredParams, ['alliance']);
  assert.deepEqual(reg('A19').metadata.requiredParams, ['samples', 'seed']);
  assert.deepEqual(reg('A38').metadata.requiredParams, ['opponentTeamKey']);
  assert.deepEqual(reg('A42').metadata.requiredParams, [
    'partnerTeamKey',
    'replacementTeamKey',
    'alliance'
  ]);
  // Stats with no dedicated parameter (e.g. B2 shared extinguisher balls) must not claim one.
  assert.equal(reg('B2').metadata.requiredParams, undefined);
});

// ---------------------------------------------------------------------------
// Scalars: single event-wide stat-tile values.
// ---------------------------------------------------------------------------

test('event-wide scalars render as a single exact stat-tile value', () => {
  for (const id of ['A20', 'B21', 'B22', 'C10', 'C21', 'D9']) {
    const raw = goldenOk(id).data as number;
    assert.equal(
      typeof raw,
      'number',
      `${id}: fixture sanity - a plain number`
    );
    const data = asStatTile(adapt(id, 'stat-tile').data!);
    assert.equal(data.values.length, 1);
    assert.equal(data.values[0].value, raw, `${id}: stat-tile value mismatch`);
  }
  assert.equal(
    reg('A20').metadata.higherIsBetter,
    false,
    'A20 Brier score: lower is better calibration'
  );
});

// ---------------------------------------------------------------------------
// Booleans: real boolean cells, never coerced to 0/1.
// ---------------------------------------------------------------------------

test('C9/D5: every boolean observation survives as a real boolean table cell matching its golden row', () => {
  for (const id of ['C9', 'D5']) {
    const raw = goldenOk(id).data as {
      tournamentKey: string;
      matchId: number;
      value: boolean;
    }[];
    const data = asTable(adapt(id, 'table').data!);
    assert.equal(data.rows.length, raw.length);
    for (let i = 0; i < raw.length; i++) {
      assert.equal(
        typeof data.rows[i].cells.value,
        'boolean',
        `${id}: row ${i} cell must be a real boolean, not 0/1`
      );
      assert.equal(
        data.rows[i].cells.value,
        raw[i].value,
        `${id}: row ${i} boolean mismatch`
      );
    }
  }
  // Fixture sanity: these are constant-but-real booleans across the event, not a fabricated single sample.
  const c9 = goldenOk('C9').data as { value: boolean }[];
  assert.ok(
    c9.every((r) => r.value === true) && c9.length === 14,
    'C9 fixture is 14 real true observations'
  );
  const d5 = goldenOk('D5').data as { value: boolean }[];
  assert.ok(
    d5.every((r) => r.value === false) && d5.length === 14,
    'D5 fixture is 14 real false observations'
  );
});

// ---------------------------------------------------------------------------
// Record-shaped ids: every named sub-field matches its golden source,
// including a whole-record `null` rendering as null cells (never 0s).
// ---------------------------------------------------------------------------

test('A11/A14/A15/A23/A27/A30/A34/A36: every named sub-field matches the golden record exactly', () => {
  const checks: [string, string[]][] = [
    ['A11', ['suppression', 'climb', 'partner']],
    ['A14', ['peak', 'delta']],
    ['A15', ['mu', 'sigma']],
    ['A23', ['floor', 'ceiling']],
    ['A27', ['wins', 'losses', 'ties', 'played']],
    ['A30', ['rank', 'rankChange']],
    ['A34', ['average', 'median']],
    ['A36', ['played', 'surrogate']]
  ];
  for (const [id, fields] of checks) {
    const raw = goldenOk(id).data as {
      teamKey: number;
      value: Record<string, number | null> | null;
    }[];
    const data = asTable(adapt(id, 'table').data!);
    const byTeam = new Map(raw.map((r) => [r.teamKey, r.value]));
    assert.equal(data.rows.length, raw.length, `${id}: one row per team`);
    for (const row of data.rows) {
      const teamKey = JSON.parse(row.id)[1] as number;
      const expected = byTeam.get(teamKey);
      for (const field of fields) {
        assert.equal(
          row.cells[field],
          expected ? expected[field] : null,
          `${id}: team ${teamKey} field ${field} mismatch`
        );
      }
    }
  }
  assert.equal(
    reg('A30').metadata.higherIsBetter,
    false,
    'A30 default measure is rank: 1 is best, so lower is better'
  );
});

test('A38: teams that never shared a match render a genuinely null head-to-head record, not a fabricated 0-0-0', () => {
  const raw = goldenOk('A38').data as {
    teamKey: number;
    value: { wins: number; losses: number; ties: number } | null;
  }[];
  assert.ok(
    raw.some((r) => r.value === null),
    'fixture sanity: some teams truly have no shared record'
  );
  const data = asTable(adapt('A38', 'table').data!);
  const byTeam = new Map(raw.map((r) => [r.teamKey, r.value]));
  for (const row of data.rows) {
    const teamKey = JSON.parse(row.id)[1] as number;
    const expected = byTeam.get(teamKey);
    if (expected === null) {
      assert.equal(
        row.cells.wins,
        null,
        `A38: team ${teamKey} has no shared matches, wins must be null, never 0`
      );
      assert.equal(row.cells.losses, null);
      assert.equal(row.cells.ties, null);
    } else {
      assert.equal(row.cells.wins, expected!.wins);
    }
  }
  // Team 1 has a real 7-0-0 record: exercise the real-zero-losses path explicitly.
  const team1Row = data.rows.find((r) => JSON.parse(r.id)[1] === 1)!;
  assert.equal(
    team1Row.cells.losses,
    0,
    'team 1 truly has zero losses - a measured zero, not a missing value'
  );
  assert.notEqual(team1Row.cells.losses, null);
});

test('A17: predicted-score rows with no trained prior stay null, never a fabricated prediction', () => {
  const raw = goldenOk('A17').data as {
    tournamentKey: string;
    matchId: number;
    value: (number | null)[];
  }[];
  const data = asTable(adapt('A17', 'table').data!);
  assert.equal(data.rows.length, raw.length);
  assert.equal(
    raw[0].value[0],
    null,
    'fixture sanity: first match has no trained prior'
  );
  assert.equal(data.rows[0].cells.predictedRed, null);
  assert.equal(data.rows[0].cells.predictedBlue, null);
  const laterOk = raw.findIndex((r) => r.value[0] !== null);
  assert.ok(laterOk > 0, 'fixture sanity: a later match has a real prediction');
  assert.equal(data.rows[laterOk].cells.predictedRed, raw[laterOk].value[0]);
  assert.equal(data.rows[laterOk].cells.predictedBlue, raw[laterOk].value[1]);
});

test('B17: signed LED-ball divergence per side survives negative and zero values unchanged', () => {
  const raw = goldenOk('B17').data as {
    value: { red: number; blue: number; extinguisher: number };
  }[];
  assert.ok(
    raw[0].value.red === 0 && raw[0].value.blue === 0,
    'fixture sanity: match 1 is a real all-zero divergence'
  );
  assert.ok(
    raw[1].value.blue < 0,
    'fixture sanity: match 2 has a real negative divergence'
  );
  const data = asTable(adapt('B17', 'table').data!);
  assert.equal(data.rows[0].cells.red, 0);
  assert.equal(data.rows[0].cells.blue, 0);
  assert.notEqual(
    data.rows[0].cells.red,
    null,
    'a measured zero divergence must not become null'
  );
  assert.equal(data.rows[1].cells.blue, raw[1].value.blue);
  assert.ok(
    (data.rows[1].cells.blue as number) < 0,
    'negative divergence must survive unclamped'
  );
  assert.equal(
    reg('B17').metadata.higherIsBetter,
    undefined,
    'signed deviation-from-zero has no uniform "better" direction'
  );
});

test('B19: stepped-vs-typed entry shares match the golden record exactly', () => {
  const raw = goldenOk('B19').data as {
    value: { steps: number; typed: number; stepShare: number | null };
  }[];
  const data = asTable(adapt('B19', 'table').data!);
  for (let i = 0; i < raw.length; i++) {
    assert.equal(data.rows[i].cells.steps, raw[i].value.steps);
    assert.equal(data.rows[i].cells.typed, raw[i].value.typed);
    assert.equal(data.rows[i].cells.stepShare, raw[i].value.stepShare);
  }
});

test('D4: a real measured zero carrier rate must never render as null, and a genuinely unmeasured rate must never render as zero', () => {
  const raw = goldenOk('D4').data as {
    teamKey: number;
    rate: number | null;
    identifiedMatches: number;
    ambiguousMatches: number;
  }[];
  const team1 = raw.find((r) => r.teamKey === 1)!;
  const team5 = raw.find((r) => r.teamKey === 5)!;
  assert.equal(
    team1.rate,
    0,
    'fixture sanity: team 1 has a real measured zero rate'
  );
  assert.equal(
    team5.rate,
    null,
    'fixture sanity: team 5 has a genuinely unmeasured rate'
  );
  const data = asTable(adapt('D4', 'table').data!);
  const byTeam = new Map(
    data.rows.map((row) => [JSON.parse(row.id)[1] as number, row])
  );
  assert.equal(byTeam.get(1)!.cells.rate, 0);
  assert.notEqual(byTeam.get(1)!.cells.rate, null);
  assert.equal(byTeam.get(5)!.cells.rate, null);
  assert.notEqual(byTeam.get(5)!.cells.rate, 0);
  assert.equal(byTeam.get(1)!.cells.identifiedMatches, 10);
  assert.equal(byTeam.get(5)!.cells.ambiguousMatches, 11);
});

test('C5: per-team zone-level histogram counts match the golden nested array exactly, real zeros included', () => {
  const raw = goldenOk('C5').data as {
    teamKey: number;
    value: { brace: number; count: number }[];
  }[];
  const data = asTable(adapt('C5', 'table').data!);
  const byTeam = new Map(raw.map((r) => [r.teamKey, r.value]));
  const levels: [string, number][] = [
    ['zoneNone', 0],
    ['zoneContact', 0.05],
    ['zoneZ1', 0.1],
    ['zoneZ2', 0.2],
    ['zoneZ3', 0.3]
  ];
  for (const row of data.rows) {
    const teamKey = JSON.parse(row.id)[1] as number;
    const value = byTeam.get(teamKey)!;
    for (const [cellId, brace] of levels) {
      const expected = value.find((entry) => entry.brace === brace)!.count;
      assert.equal(
        row.cells[cellId],
        expected,
        `C5: team ${teamKey} ${cellId} mismatch`
      );
    }
  }
  // Team 1: real zero counts at every non-Z3 level, real 10 at Z3 - nesting fully surfaced, not dropped.
  const team1 = data.rows.find((row) => JSON.parse(row.id)[1] === 1)!;
  assert.equal(team1.cells.zoneNone, 0);
  assert.equal(team1.cells.zoneZ3, 10);
});

// ---------------------------------------------------------------------------
// A16 / A18 / A42: per-match predictions with a per-row failure union.
// ---------------------------------------------------------------------------

test('A16/A18/A42: failed prediction rows render as a real null with the reason in notes, ok rows carry the exact predicted value', () => {
  for (const id of ['A16', 'A18', 'A42']) {
    const raw = goldenOk(id).data as (
      | { tournamentKey: string; matchId: number; value: number }
      | {
          tournamentKey: string;
          matchId: number;
          status: string;
          reason: string;
        }
    )[];
    const failures = raw.filter((r) => 'status' in r);
    const oks = raw.filter((r) => !('status' in r));
    assert.ok(
      failures.length > 0 && oks.length > 0,
      `${id}: fixture sanity - a real mix of failed and ok rows`
    );
    const data = asBar(adapt(id, 'bar').data!);
    assert.equal(
      data.series[0].points.length,
      raw.length,
      `${id}: a failed row is still a real point (null), not dropped`
    );
    const frame = adapt(id, 'bar');
    assert.equal(
      frame.notes?.length,
      failures.length,
      `${id}: exactly one note per failed row`
    );
    let failedSeen = 0,
      okSeen = 0;
    raw.forEach((row, i) => {
      if ('status' in row) {
        assert.equal(
          data.series[0].points[i].value,
          null,
          `${id}: failed row ${i} must be null`
        );
        failedSeen++;
      } else {
        assert.equal(
          data.series[0].points[i].value,
          row.value,
          `${id}: ok row ${i} must match exactly`
        );
        okSeen++;
      }
    });
    assert.equal(failedSeen, failures.length);
    assert.equal(okSeen, oks.length);
  }
});

// ---------------------------------------------------------------------------
// A19: KNOWN DEFECT FIX. The legacy adapter collapses the
// `{red,blue,samples,seed}` quantile object to null. Here every quantile
// must survive as its own named, typed column.
// ---------------------------------------------------------------------------

test('A19 DEFECT FIX: predicted-score quantile arrays survive as six named columns, never collapsed to null', () => {
  const raw = goldenOk('A19').data as (
    | {
        tournamentKey: string;
        matchId: number;
        value: {
          red: (number | null)[];
          blue: (number | null)[];
          samples: number;
          seed: number;
        };
      }
    | { tournamentKey: string; matchId: number; status: string; reason: string }
  )[];
  const data = asTable(adapt('A19', 'table').data!);
  assert.equal(data.rows.length, raw.length);

  const failIndex = raw.findIndex((r) => 'status' in r);
  assert.ok(
    failIndex >= 0,
    'fixture sanity: at least one failed prediction row exists'
  );
  assert.equal(data.rows[failIndex].cells.redP10, null);
  assert.equal(data.rows[failIndex].cells.redP50, null);
  assert.equal(data.rows[failIndex].cells.blueP90, null);

  const okIndex = raw.findIndex((r) => !('status' in r));
  assert.ok(
    okIndex >= 0,
    'fixture sanity: at least one real prediction row exists'
  );
  const okRow = raw[okIndex] as {
    value: {
      red: (number | null)[];
      blue: (number | null)[];
      samples: number;
      seed: number;
    };
  };
  // This is the exact defect: the legacy adapter's `resolveValue` only
  // recognises a `{score:number}` shape and returns null for anything else,
  // so this whole quantile object used to disappear. Assert every quantile
  // is preserved as a distinct, real number - not one collapsed null.
  assert.equal(data.rows[okIndex].cells.redP10, okRow.value.red[0]);
  assert.equal(data.rows[okIndex].cells.redP50, okRow.value.red[1]);
  assert.equal(data.rows[okIndex].cells.redP90, okRow.value.red[2]);
  assert.equal(data.rows[okIndex].cells.blueP10, okRow.value.blue[0]);
  assert.equal(data.rows[okIndex].cells.blueP50, okRow.value.blue[1]);
  assert.equal(data.rows[okIndex].cells.blueP90, okRow.value.blue[2]);
  assert.equal(data.rows[okIndex].cells.samples, okRow.value.samples);
  assert.ok(
    typeof data.rows[okIndex].cells.redP10 === 'number',
    'a quantile must be a real number, not null and not a collapsed object'
  );
  // p10 <= p50 <= p90 must hold for both alliances - the ordering survived, not just presence.
  assert.ok(
    (data.rows[okIndex].cells.redP10 as number) <=
      (data.rows[okIndex].cells.redP50 as number)
  );
  assert.ok(
    (data.rows[okIndex].cells.redP50 as number) <=
      (data.rows[okIndex].cells.redP90 as number)
  );
});

// ---------------------------------------------------------------------------
// A21: matchKey JSON-tuple decoding.
// ---------------------------------------------------------------------------

test('A21: the JSON matchKey tuple is decoded into a real tournament-qualified match identity', () => {
  const raw = goldenOk('A21').data as { matchKey: string; value: number }[];
  const data = asBar(adapt('A21', 'bar').data!);
  assert.equal(data.entities.length, raw.length);
  raw.forEach((row, i) => {
    const [tournamentKey, matchId] = JSON.parse(row.matchKey) as [
      string,
      number
    ];
    assert.equal(
      data.entities[i].id,
      JSON.stringify(['match', tournamentKey, matchId])
    );
    assert.equal(data.series[0].points[i].value, row.value);
  });
});

// ---------------------------------------------------------------------------
// B13 / B14: KNOWN DEFECT FIX. Line x-coordinates must be real numbers, not
// formatted strings, with the formatted text living only in a separate
// `label` field.
// ---------------------------------------------------------------------------

test('B13 DEFECT FIX: milestone-split x-coordinates are real numbers, chronologically ordered, distinct from their formatted labels', () => {
  const raw = goldenOk('B13').data as {
    tournamentKey: string;
    matchId: number;
    value: { milestone: number; seconds: number | null }[];
  }[];
  const data = asLine(adapt('B13', 'line').data!);
  assert.equal(data.xType, 'number');

  const match1 = raw[0];
  const reached = match1.value.filter((m) => m.seconds !== null);
  assert.equal(
    reached.length,
    2,
    'fixture sanity: match 1 reaches 2 of the 4 milestones'
  );
  const series1 = data.series.find(
    (s) =>
      s.id === JSON.stringify(['match', match1.tournamentKey, match1.matchId])
  )!;
  assert.ok(series1, 'match 1 series present');
  assert.equal(
    series1.points.length,
    2,
    'only the reached milestones become real points'
  );
  for (const point of series1.points) {
    assert.equal(
      typeof point.x,
      'number',
      'x-coordinate must be a real number, never a formatted string'
    );
    assert.notEqual(
      String(point.x),
      point.label,
      'the numeric coordinate is never the same string as its formatted label'
    );
    assert.match(
      point.label!,
      /^\d+ balls$/,
      'the formatted label lives separately from the coordinate'
    );
  }
  for (let i = 1; i < series1.points.length; i++)
    assert.ok(
      series1.points[i].x >= series1.points[i - 1].x,
      'chronologically ordered'
    );

  // The unreached milestones (seconds: null) have no real x-coordinate and
  // must be documented in notes rather than becoming a fabricated point.
  const frame = adapt('B13', 'line');
  assert.ok(
    frame.notes?.some((n) => n.includes('not reached')),
    'unreached milestone documented in notes, not silently dropped'
  );

  // Table fallback preserves the same information including the nulls as null cells.
  const tableData = asTable(adapt('B13', 'table').data!);
  assert.equal(
    tableData.rows.length,
    raw.reduce((sum, r) => sum + r.value.length, 0)
  );
});

test('B14 DEFECT FIX: scoring-curve x-coordinates are real numbers, and the computed skew survives as a note', () => {
  const raw = goldenOk('B14').data as {
    tournamentKey: string;
    matchId: number;
    value: {
      points: { seconds: number | null; count: unknown }[];
      skew: number | null;
    } | null;
  }[];
  const data = asLine(adapt('B14', 'line').data!);
  assert.equal(data.xType, 'number');
  const match1 = raw[0];
  const series1 = data.series.find(
    (s) =>
      s.id === JSON.stringify(['match', match1.tournamentKey, match1.matchId])
  )!;
  assert.ok(series1);
  assert.equal(
    series1.points.length,
    match1.value!.points.filter((p) => p.seconds !== null).length
  );
  for (const point of series1.points)
    assert.equal(
      typeof point.x,
      'number',
      'x-coordinate must be numeric, never a formatted string'
    );
  for (let i = 1; i < series1.points.length; i++)
    assert.ok(series1.points[i].x >= series1.points[i - 1].x);
  // Values themselves (ball counts) must match exactly, including any real zero.
  const nonNullPoints = match1.value!.points.filter((p) => p.seconds !== null);
  series1.points.forEach((point, i) =>
    assert.equal(point.value, nonNullPoints[i].count)
  );

  assert.equal(
    match1.value!.skew,
    -0.48947368421052634,
    'fixture sanity: match 1 has a real, non-zero skew'
  );
  const frame = adapt('B14', 'line');
  assert.ok(
    frame.notes?.some((n) => n.includes('skew') && n.includes('front-loaded')),
    'the front/back-loaded skew is preserved as a note, not dropped'
  );
});

// ---------------------------------------------------------------------------
// B16: extinguisher entry attribution by tablet actor.
// ---------------------------------------------------------------------------

test('B16: per-actor entry attribution rows match the golden nested array exactly', () => {
  const raw = goldenOk('B16').data as {
    tournamentKey: string;
    matchId: number;
    value: { actor: string; entries: number; netEntered: number }[];
  }[];
  const data = asTable(adapt('B16', 'table').data!);
  const expectedRows = raw.reduce((sum, r) => sum + r.value.length, 0);
  assert.equal(
    data.rows.length,
    expectedRows,
    'every (match, actor) pair becomes its own row'
  );
  assert.equal(
    new Set(data.rows.map((r) => r.id)).size,
    data.rows.length,
    'row identities are unique'
  );
  const match1 = raw[0];
  const match1Rows = data.rows.filter((r) =>
    r.label.startsWith(matchLabel(match1.tournamentKey, match1.matchId))
  );
  assert.equal(match1Rows.length, match1.value.length);
  match1.value.forEach((actorEntry, i) => {
    assert.equal(match1Rows[i].cells.entries, actorEntry.entries);
    assert.equal(match1Rows[i].cells.netEntered, actorEntry.netEntered);
  });
});

function matchLabel(tournamentKey: string, matchId: number): string {
  return (
    matches.find((m) => m.tournamentKey === tournamentKey && m.id === matchId)
      ?.name ?? `${tournamentKey} · Match ${matchId}`
  );
}

// ---------------------------------------------------------------------------
// C-series nested structures: KNOWN DEFECT FIX. Every nested per-station /
// per-match / per-transition entry is surfaced as a real, identified
// measure rather than the nested array disappearing.
// ---------------------------------------------------------------------------

test('C1 DEFECT FIX: all six per-station brace values per match are surfaced, real zero included', () => {
  const raw = goldenOk('C1').data as {
    tournamentKey: string;
    matchId: number;
    value: { station: string; brace: number }[];
  }[];
  const data = asTable(adapt('C1', 'table').data!);
  assert.equal(
    data.rows.length,
    raw.length * 6,
    'every station of every match becomes its own row - nothing dropped'
  );
  const match1 = raw[0];
  const blueThree = match1.value.find((s) => s.station === 'blueRobotThree')!;
  assert.equal(
    blueThree.brace,
    0,
    'fixture sanity: blueRobotThree has a real zero brace state'
  );
  const match1Row = data.rows.find(
    (r) =>
      r.label.endsWith('blueRobotThree') &&
      r.label.startsWith(matchLabel(match1.tournamentKey, match1.matchId))
  )!;
  assert.ok(
    match1Row,
    'the real zero station row must exist, not be dropped as falsy'
  );
  assert.equal(match1Row.cells.value, 0);
  assert.notEqual(match1Row.cells.value, null);
});

test('C11/C13/C16/C20 DEFECT FIX: every per-team, per-match nested value is surfaced as its own identified row', () => {
  for (const id of ['C11', 'C13', 'C16', 'C20']) {
    const raw = goldenOk(id).data as {
      teamKey: number;
      value:
        | { tournamentKey: string; matchId: number; value: number | null }[]
        | null;
    }[];
    const expectedRows = raw.reduce(
      (sum, r) => sum + (r.value?.length ?? 0),
      0
    );
    const data = asTable(adapt(id, 'table').data!);
    assert.equal(
      data.rows.length,
      expectedRows,
      `${id}: every team's per-match array must be fully surfaced, not collapsed`
    );
    assert.equal(
      new Set(data.rows.map((r) => r.id)).size,
      data.rows.length,
      `${id}: every row identity is unique`
    );

    // Spot-check team 1's first nested entry matches exactly by value.
    const team1 = raw.find((r) => r.teamKey === 1)!;
    assert.ok(
      team1.value && team1.value.length > 0,
      `${id}: fixture sanity - team 1 has nested entries`
    );
    const expectedFirst = team1.value![0];
    const team1Rows = data.rows.filter((r) => r.label.startsWith('Team 1 ·'));
    assert.equal(team1Rows.length, team1.value!.length);
    assert.equal(
      team1Rows[0].cells.value,
      expectedFirst.value,
      `${id}: team 1's first nested match value mismatch`
    );
  }
});

test('C12: single event-wide MVP-climb record matches the golden composite exactly', () => {
  const raw = goldenOk('C12').data as {
    teamKey: number;
    tournamentKey: string;
    matchId: number;
    value: number;
  };
  const data = asTable(adapt('C12', 'table').data!);
  assert.equal(data.rows.length, 1);
  assert.equal(data.rows[0].cells.value, raw.value);
  assert.ok(
    data.rows[0].label.includes(`Team ${raw.teamKey}`),
    'row label identifies the winning team'
  );
});

test('C19 DEFECT FIX: every ordered from/to brace transition, per team per match, is surfaced as its own row', () => {
  const raw = goldenOk('C19').data as {
    teamKey: number;
    value: {
      tournamentKey: string;
      matchId: number;
      value: { atUtc: string; from: unknown; to: unknown }[];
    }[];
  }[];
  const expectedRows = raw.reduce(
    (sum, teamRow) =>
      sum + teamRow.value.reduce((s, matchRow) => s + matchRow.value.length, 0),
    0
  );
  const data = asTable(adapt('C19', 'table').data!);
  assert.equal(
    data.rows.length,
    expectedRows,
    'every transition of every team/match must become its own row - nothing dropped'
  );
  assert.equal(
    new Set(data.rows.map((r) => r.id)).size,
    data.rows.length,
    'every transition row identity is unique'
  );

  const team1 = raw.find((r) => r.teamKey === 1)!;
  const firstMatch = team1.value[0];
  const firstTransition = firstMatch.value[0];
  const team1Rows = data.rows.filter((r) => r.label.startsWith('Team 1 ·'));
  assert.equal(team1Rows[0].cells.from, firstTransition.from);
  assert.equal(team1Rows[0].cells.to, firstTransition.to);
  assert.equal(team1Rows[0].cells.atUtc, firstTransition.atUtc);
  assert.equal(
    team1Rows[0].cells.from,
    0,
    'a real zero "from" zone must survive, not be dropped as falsy'
  );
  assert.notEqual(team1Rows[0].cells.from, null);
});

test('C22: zone-3 count per match is plotted by real chronological match sequence index', () => {
  const raw = goldenOk('C22').data as {
    tournamentKey: string;
    matchId: number;
    value: number | null;
  }[];
  const data = asLine(adapt('C22', 'line').data!);
  assert.equal(data.series.length, 1);
  const { points } = data.series[0];
  assert.equal(points.length, raw.length);
  assert.deepEqual(
    points.map((p) => p.x),
    raw.map((_, i) => i),
    'x is the real 0-based sequence index'
  );
  assert.deepEqual(
    points.map((p) => p.value),
    raw.map((r) => r.value)
  );
  for (let i = 1; i < points.length; i++)
    assert.ok(points[i].x > points[i - 1].x, 'strictly increasing sequence');
});

test('D8: single event-wide lift-specialist record matches the golden composite exactly', () => {
  const raw = goldenOk('D8').data as {
    teamKey: number;
    rate: number | null;
    identifiedMatches: number;
    ambiguousMatches: number;
  };
  const data = asTable(adapt('D8', 'table').data!);
  assert.equal(data.rows.length, 1);
  assert.equal(data.rows[0].cells.rate, raw.rate);
  assert.equal(data.rows[0].cells.identifiedMatches, raw.identifiedMatches);
  assert.equal(data.rows[0].cells.ambiguousMatches, raw.ambiguousMatches);
});

// ---------------------------------------------------------------------------
// Determinism: identical inputs must produce identical output.
// ---------------------------------------------------------------------------

test('adapt is deterministic for every A/B/C/D id: identical inputs produce identical frames', () => {
  for (const id of AD_IDS) {
    if (SOURCE_FAILURE_IDS.has(id)) continue;
    const registration = reg(id);
    const spec = buildSpec(id, registration.metadata.defaultKind);
    const first = registration.adapt(golden[id], spec, {
      ...ctx,
      catalogueId: id
    });
    const second = registration.adapt(golden[id], spec, {
      ...ctx,
      catalogueId: id
    });
    assert.deepEqual(second, first, `${id}: adapt is not deterministic`);
  }
});
