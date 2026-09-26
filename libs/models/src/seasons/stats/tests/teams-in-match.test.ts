import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.js';
import { definitions } from '../registry.js';
import { fixtureParams } from '../parameter-schemas.js';
import { prepareGraphicFrame } from '../presentation/semantic-registry.js';
import type { AdaptContext } from '../presentation/adapt-context.js';
import type { GraphicSpec, PresentationData } from '../../../base/Graphics.js';
import type { StatResult, StatsQuery } from '../types.js';

/**
 * The three "who" selectors for a multi-team ("leaderboard") stat - one
 * specific team (`teamKey`), a match's participants (`teamsInMatchId`), an
 * explicit hand-picked list (`teamKeyList`), or "every team in the event"
 * (none of the three set) - and their shared precedence, resolved by
 * `resolveTeamKeys` in `types.ts` and consumed identically by every
 * `compute*` module's `teamKeys`/`keys` derivation.
 */

async function calculate(
  id: string,
  ctx = fixture(),
  params: Record<string, any> = fixtureParams(id),
  selectors: StatsQuery['selectors'] = {}
) {
  const definition = definitions.find((d) => d.catalogueId === id)!;
  return definition.compute(ctx, params, selectors);
}

/** Qualification-only fixture, so match `id`s are unambiguous across tournaments. */
function qualOnlyFixture() {
  const ctx = fixture();
  ctx.matches = ctx.matches.filter((m) => m.tournamentKey === 'q');
  return ctx;
}

test("A1 (OPR, generic rating model): teamsInMatchId narrows the leaderboard to that match's roster, not the whole event", async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const expected = [...match1.participants!.map((p) => p.teamKey)].sort(
    (a, b) => a - b
  );
  assert.ok(expected.length > 0 && expected.length < ctx.teams.length);

  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamsInMatchId: 1
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey).sort((a, b) => a - b),
    expected
  );
});

test('A1: an explicit teamKey always wins over teamsInMatchId, even when both are present', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamKey: 2,
    teamsInMatchId: 1
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey),
    [2]
  );
});

test('A10 (EPA, uses the shared rows() leaderboard helper): teamsInMatchId narrows it the same way', async () => {
  const ctx = qualOnlyFixture();
  const match2 = ctx.matches.find((m) => m.id === 2)!;
  const expected = [...match2.participants!.map((p) => p.teamKey)].sort(
    (a, b) => a - b
  );

  const r = await calculate('A10', ctx, fixtureParams('A10'), {
    teamsInMatchId: 2
  });
  assert.equal(r.status, 'ok');
  const rows = (r as any).data as { teamKey: number }[];
  assert.deepEqual(
    rows.map((t) => t.teamKey).sort((a, b) => a - b),
    expected
  );
});

test('A2 (season-specific game model, computeGameModel): teamsInMatchId narrows the leaderboard the same way as computeGeneric', async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const expected = [...match1.participants!.map((p) => p.teamKey)].sort(
    (a, b) => a - b
  );

  const r = await calculate('A2', ctx, fixtureParams('A2'), {
    teamsInMatchId: 1
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey).sort((a, b) => a - b),
    expected
  );
});

test('C4 (climb.ts, section C): teamsInMatchId narrows the leaderboard the same way', async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const expected = [...match1.participants!.map((p) => p.teamKey)].sort(
    (a, b) => a - b
  );

  const r = await calculate('C4', ctx, fixtureParams('C4'), {
    teamsInMatchId: 1
  });
  assert.equal(r.status, 'ok');
  const rows = (r as any).data as { teamKey: number }[];
  assert.deepEqual(
    rows.map((t) => t.teamKey).sort((a, b) => a - b),
    expected
  );
});

test('teamsInMatchId ambiguous across tournaments is rejected, exactly like matchId', async () => {
  const ctx = fixture(); // every tournament, so match id 1 exists 4 times
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamsInMatchId: 1
  });
  assert.equal(r.status, 'unavailable');
  assert.match((r as any).reason, /ambiguous across tournaments/);
});

test('teamsInMatchId naming an absent match is rejected, exactly like matchId', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamsInMatchId: 99999
  });
  assert.equal(r.status, 'not_found');
});

// ---------------------------------------------------------------------------
// `teamKeyList` - the third "who" selector: an explicit, hand-picked list of
// teams, unconnected to any one match. Same shared `resolveTeamKeys`
// precedence as `teamKey`/`teamsInMatchId` (see `types.ts`).
// ---------------------------------------------------------------------------

test('A1: teamKeyList narrows the leaderboard to exactly those teams, deduped and sorted', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamKeyList: [7, 2, 4, 2]
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey),
    [2, 4, 7]
  );
});

test('A1: teamKey wins over teamKeyList when both are present', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamKey: 3,
    teamKeyList: [7, 2, 4]
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey),
    [3]
  );
});

test('A1: teamsInMatchId wins over teamKeyList when both are present', async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const expected = [...match1.participants!.map((p) => p.teamKey)].sort(
    (a, b) => a - b
  );

  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamsInMatchId: 1,
    teamKeyList: [2, 4]
  });
  assert.equal(r.status, 'ok');
  const teams = (r as any).data.teams as { teamKey: number }[];
  assert.deepEqual(
    teams.map((t) => t.teamKey).sort((a, b) => a - b),
    expected
  );
});

test('C4 (climb.ts, a non-computeGeneric compute module): teamKeyList narrows it the same way', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('C4', ctx, fixtureParams('C4'), {
    teamKeyList: [5, 8]
  });
  assert.equal(r.status, 'ok');
  const rows = (r as any).data as { teamKey: number }[];
  assert.deepEqual(
    rows.map((t) => t.teamKey).sort((a, b) => a - b),
    [5, 8]
  );
});

test('teamKeyList naming an unknown team is rejected', async () => {
  const ctx = qualOnlyFixture();
  const r = await calculate('A1', ctx, fixtureParams('A1'), {
    teamKeyList: [2, 99999]
  });
  assert.equal(r.status, 'not_found');
});

// ---------------------------------------------------------------------------
// Phase 2: `applyAllianceGroups` - alliance-coloring/grouping is opt-in,
// driven purely by `spec.selectors.teamsInMatchId`, through the SAME
// `prepareGraphicFrame` entry point production actually calls. `teamKeyList`
// deliberately never triggers it - a hand-picked list has no single match
// to derive red/blue from.
// ---------------------------------------------------------------------------

function adaptContextFrom(
  ctx: ReturnType<typeof fixture>,
  catalogueId: string
): AdaptContext {
  return {
    catalogueId,
    asOfUtc: '2026-09-01T15:00:00.000Z',
    teams: ctx.teams.map((t) => ({
      teamKey: t.teamKey,
      teamNumber: t.teamNumber,
      teamNameShort: t.teamNameShort
    })),
    matches: ctx.matches.map((m) => ({
      tournamentKey: m.tournamentKey,
      id: m.id,
      name: m.name,
      participants: m.participants?.map((p) => ({
        teamKey: p.teamKey,
        station: p.station
      }))
    }))
  };
}

function barSpec(
  catalogueId: string,
  selectors: GraphicSpec['selectors']
): GraphicSpec {
  return {
    id: `test-${catalogueId}`,
    title: catalogueId,
    stat: catalogueId,
    selectors,
    filters: {},
    params: {},
    kind: 'bar',
    mode: 'fullscreen',
    options: {}
  };
}

function barEntities(data: PresentationData | undefined) {
  assert.ok(data);
  assert.equal(data!.kind, 'bar');
  return (data as Extract<PresentationData, { kind: 'bar' }>).entities;
}

test("A1 + teamsInMatchId: prepareGraphicFrame colors every entity red/blue by that match's alliance", async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const redKeys = new Set(
    match1.participants!.filter((p) => p.station < 20).map((p) => p.teamKey)
  );
  const blueKeys = new Set(
    match1.participants!.filter((p) => p.station >= 20).map((p) => p.teamKey)
  );

  const result = (await calculate('A1', ctx, fixtureParams('A1'), {
    teamsInMatchId: 1
  })) as Extract<StatResult, { status: 'ok' }>;
  assert.equal(result.status, 'ok');

  const frame = prepareGraphicFrame(
    result,
    barSpec('A1', { teamsInMatchId: 1 }),
    adaptContextFrom(ctx, 'A1')
  );
  const entities = barEntities(frame.data);
  assert.ok(entities.length > 0, 'expects at least one entity to check');
  for (const entity of entities) {
    const teamKey = JSON.parse(entity.id)[1] as number;
    if (redKeys.has(teamKey))
      assert.equal(
        entity.group,
        'red',
        `team ${teamKey} should be grouped red`
      );
    else if (blueKeys.has(teamKey))
      assert.equal(
        entity.group,
        'blue',
        `team ${teamKey} should be grouped blue`
      );
    else assert.fail(`team ${teamKey} is not a participant of match 1`);
  }
});

test('A1 without teamsInMatchId (plain "all teams" leaderboard): no entity carries an alliance group', async () => {
  const ctx = qualOnlyFixture();
  const result = (await calculate(
    'A1',
    ctx,
    fixtureParams('A1'),
    {}
  )) as Extract<StatResult, { status: 'ok' }>;
  assert.equal(result.status, 'ok');

  const frame = prepareGraphicFrame(
    result,
    barSpec('A1', {}),
    adaptContextFrom(ctx, 'A1')
  );
  const entities = barEntities(frame.data);
  assert.ok(entities.length > 0, 'expects at least one entity to check');
  assert.ok(entities.every((e) => e.group === undefined));
});

test('A1 + teamsInMatchId but a single teamKey ALSO set: modularity - the narrowed single-team result still carries its own group', async () => {
  const ctx = qualOnlyFixture();
  const match1 = ctx.matches.find((m) => m.id === 1)!;
  const { teamKey } = match1.participants!.find((p) => p.station >= 20)!; // a blue-alliance team

  const result = (await calculate('A1', ctx, fixtureParams('A1'), {
    teamKey,
    teamsInMatchId: 1
  })) as Extract<StatResult, { status: 'ok' }>;
  assert.equal(result.status, 'ok');

  const frame = prepareGraphicFrame(
    result,
    barSpec('A1', { teamKey, teamsInMatchId: 1 }),
    adaptContextFrom(ctx, 'A1')
  );
  const entities = barEntities(frame.data);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].group, 'blue');
});

test('A1 + teamKeyList: no entity carries an alliance group - a hand-picked list has no single match to derive red/blue from', async () => {
  const ctx = qualOnlyFixture();
  const result = (await calculate('A1', ctx, fixtureParams('A1'), {
    teamKeyList: [2, 4, 7]
  })) as Extract<StatResult, { status: 'ok' }>;
  assert.equal(result.status, 'ok');

  const frame = prepareGraphicFrame(
    result,
    barSpec('A1', { teamKeyList: [2, 4, 7] }),
    adaptContextFrom(ctx, 'A1')
  );
  const entities = barEntities(frame.data);
  assert.equal(entities.length, 3);
  assert.ok(entities.every((e) => e.group === undefined));
});
