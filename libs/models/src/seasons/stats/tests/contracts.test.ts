import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixtureParams } from '../parameter-schemas.js';
import { fixture } from './fixture.js';
import {
  definitions,
  normalizeQuery,
  catalogueMetadata,
  composeRegistry
} from '../registry.js';
import {
  assertJson,
  canonicalJson,
  queryHash
} from '../util/canonical-json.js';
import { leastSquares } from '../util/matrix-solve.js';
import { ratings } from '../generic/rating-models.js';
import {
  cleanActions,
  replayAt,
  reconciliation,
  clockAt
} from '../util/action-event-replay.js';
const golden = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);
test('all 232 calculators have unique IDs, schemas, metadata and deterministic golden results', async () => {
  assert.equal(definitions.length, 232);
  assert.equal(new Set(definitions.map((d) => d.catalogueId)).size, 232);
  assert.equal(catalogueMetadata('fgc_2026').length, 232);
  for (const d of definitions) {
    assert.match(d.slug, /^(generic|fgc2026)\.[a-z0-9-]+$/);
    assert.ok(
      d.units && d.dependencies.length && d.precision >= 0 && d.version > 0
    );
    const ctx = fixture(),
      params = fixtureParams(d.catalogueId);
    const result = await d.compute(ctx, params, {});
    d.resultSchema.parse(result);
    assertJson(result);
    assert.deepEqual(
      JSON.parse(canonicalJson(result)),
      golden[d.catalogueId],
      d.catalogueId + ' golden'
    );
    assert.deepEqual(
      await d.compute(fixture(), params, {}),
      result,
      d.catalogueId + ' deterministic'
    );
    const empty = {
      ...ctx,
      matches: [],
      teams: [],
      rankings: [],
      alliances: [],
      actions: [],
      history: [],
      detailHistory: []
    };
    const missing = await d.compute(empty, params, {});
    assertJson(missing);
    assert.ok(
      d.catalogueId === 'F14' || missing.status !== 'ok',
      d.catalogueId + ' empty outcome'
    );
    assert.equal(
      (await d.compute(ctx, params, { teamKey: 99999 })).status,
      'not_found',
      d.catalogueId + ' missing team'
    );
  }
});
test('registry rejects duplicate identities; canonical hashes include parameters', () => {
  assert.throws(() => composeRegistry([definitions[0], definitions[0]]));
  const d = definitions[0],
    a = normalizeQuery(
      {
        eventKey: 'event',
        stat: d.slug,
        filters: { tournamentLevels: [30, 2, 30] }
      },
      d
    ),
    b = normalizeQuery(
      {
        eventKey: 'event',
        stat: d.slug,
        filters: { tournamentLevels: [2, 30] }
      },
      d
    );
  assert.equal(queryHash(a), queryHash(b));
  assert.notEqual(
    queryHash(a),
    queryHash({ ...a, params: { ...a.params, window: 4 } })
  );
  const rank = definitions.find((d) => d.catalogueId === 'A29')!;
  assert.throws(() =>
    normalizeQuery(
      {
        eventKey: 'event',
        stat: rank.slug,
        filters: { tournamentTypes: ['Round Robin'] }
      },
      rank
    )
  );
});
test('JSON rejects non-JSON and nonfinite values', () => {
  for (const v of [
    NaN,
    Infinity,
    -Infinity,
    new Map(),
    new Set(),
    new Date(),
    undefined,
    { x: undefined },
    [NaN]
  ])
    assert.throws(() => assertJson(v));
  const cyclic: any = {};
  cyclic.self = cyclic;
  assert.throws(() => assertJson(cyclic));
});
test('SVD known, singular, underdetermined and ridge fixtures', () => {
  const full = leastSquares(
    [
      [1, 1, 0],
      [1, 0, 1],
      [0, 1, 1]
    ],
    [10, 13, 7]
  );
  for (const [i, v] of [8, 2, 5].entries())
    assert.ok(Math.abs(full.values[i] - v) < 1e-9);
  const early = leastSquares([[1, 1, 1]], [90]);
  assert.ok(early.underdetermined);
  for (const v of early.values) assert.ok(Math.abs(v - 30) < 1e-9);
  const singular = leastSquares(
    [
      [1, 1],
      [1, 1]
    ],
    [20, 20]
  );
  assert.ok(singular.underdetermined);
  assert.ok(Math.abs(singular.values[0] - 10) < 1e-9);
  const ridge = leastSquares([[1, 1]], [20], 1, 5);
  assert.ok(Math.abs(ridge.values[0] - 25 / 3) < 1e-9);
});
test('Elo and EPA constants, simultaneous updates and ties', () => {
  const m = {
    key: '1',
    red: [1, 2, 3],
    blue: [4, 5, 6],
    redScore: 90,
    blueScore: 60
  };
  assert.equal(ratings([m], 'elo').ratings[1], 1516);
  assert.equal(ratings([m], 'elo').ratings[4], 1484);
  assert.equal(ratings([m]).ratings[1], 26.5);
  assert.equal(ratings([m]).ratings[4], 23.5);
  assert.equal(ratings([{ ...m, blueScore: 90 }], 'elo').ratings[1], 1500);
});
test('audit cleanup, replay, lifecycle anchors and reconciliation', () => {
  const ctx = fixture(),
    m = ctx.matches[0],
    raw = ctx.actions.filter((a) => a.tournamentKey === 'q' && a.id === 1),
    clean = cleanActions(raw, { physicalOnly: true });
  assert.equal(
    clean.filter((a) => a.occurredAtUtc < '2026-09-01T12:00:03.000Z').length,
    1
  );
  assert.equal(clean[0].oldValueJson, '0');
  assert.equal(clean[0].newValueJson, '150');
  assert.ok(!clean.some((a) => a.fieldPath?.includes('approximate')));
  assert.equal(
    cleanActions(raw, { unitOnly: true, physicalOnly: true }).length,
    4
  );
  assert.ok(replayAt(ctx, m, '2026-09-01T12:02:00.000Z'));
  assert.equal(clockAt(ctx, m, '2026-09-01T12:02:30.000Z')!.timeLeft, 0);
  assert.ok(reconciliation(ctx, m).every((r) => r.matches));
  assert.equal(replayAt(ctx, m, '2026-08-31T00:00:00.000Z'), null);
});

test('every calculator handles partial snapshots, unseen teams and missing historical fields', async () => {
  for (const d of definitions) {
    for (const variant of [
      'partial-details',
      'unplayed-team',
      'partial-history',
      'no-participants',
      'no-match-times'
    ] as const) {
      const ctx = fixture(),
        selectors: { teamKey?: number } = {};
      if (variant === 'partial-details') ctx.matches[0].details = undefined;
      if (variant === 'unplayed-team') {
        ctx.teams.push({ ...ctx.teams[0], teamKey: 999 });
        selectors.teamKey = 999;
      }
      if (variant === 'partial-history') {
        delete ctx.history[0].redScore;
        delete ctx.detailHistory[0].wildfireInRedSuppressionUnit;
      }
      if (variant === 'no-participants')
        ctx.matches.forEach((m) => (m.participants = []));
      if (variant === 'no-match-times')
        ctx.matches.forEach((m) => {
          m.actualStartTime = '';
          m.prestartTime = '';
          m.scheduledTime = '';
        });
      const result = await d.compute(
        ctx,
        fixtureParams(d.catalogueId),
        selectors
      );
      assertJson(result);
      assert.ok(
        d.resultSchema.safeParse(result).success,
        d.catalogueId + ' ' + variant
      );
    }
  }
});

test('selectors are explicit and equivalent replay timestamp offsets canonicalize', () => {
  const replay = definitions.find((d) => d.catalogueId === 'M15')!;
  const q = {
    eventKey: 'event',
    stat: replay.slug,
    params: { atUtc: '2026-09-01T12:00:00Z' }
  };
  assert.equal(
    queryHash(normalizeQuery(q, replay)),
    queryHash(
      normalizeQuery(
        { ...q, params: { atUtc: '2026-09-01T08:00:00-04:00' } },
        replay
      )
    )
  );
  assert.throws(() =>
    normalizeQuery({ ...q, selectors: { allianceSeed: 1 } }, replay)
  );
  assert.throws(() => assertJson(new Array(2)));
  assert.throws(() => assertJson({ [Symbol('hidden')]: 1 }));
});
