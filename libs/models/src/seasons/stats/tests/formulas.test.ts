import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.js';
import { definitions } from '../registry.js';
import { fixtureParams } from '../parameter-schemas.js';
import {
  calculateScore,
  calculateRankingPoints,
  IgnitingInnovationSeason
} from '../../FGC26_IgnitingInnovation.js';
import { bradleyTerry } from '../generic/rating-models.js';
import { clockAt, replayAt } from '../util/action-event-replay.js';
import type { CalculatorContext } from '../types.js';
async function calculate(
  id: string,
  ctx = fixture(),
  params: Record<string, any> = fixtureParams(id),
  selectors: Record<string, number> = {}
) {
  const definition = definitions.find((d) => d.catalogueId === id)!;
  return definition.compute(ctx, params, selectors);
}
test('independent scoring identities and catalogue constants', async () => {
  const ctx = fixture();
  ctx.matches = [ctx.matches[0]];
  const value = async (id: string) => {
    const r = await calculate(id, ctx);
    assert.equal(r.status, 'ok');
    return (r as any).data;
  };
  assert.equal((await value('B3'))[0].value, 210);
  assert.equal((await value('B4'))[0].value, 0.42);
  assert.equal((await value('B5'))[0].value, 290);
  assert.ok(Math.abs((await value('C2'))[0].value - 1.9) < 1e-12);
  assert.equal((await value('E1'))[0].value, 10);
  assert.equal((await value('D2'))[0].value, 0);
  const slices = (await value('F1'))[0].value;
  assert.ok(Math.abs(slices.suppression - 190) < 1e-12);
  assert.equal(slices.extinguisher, 40);
  assert.equal(slices.coopertition, 10);
  assert.equal((await value('F14')).points, 1065);
  assert.equal(await value('B21'), 210);
  const decomposition = (await value('L1'))[0].value;
  assert.ok(
    Math.abs(
      Object.entries(decomposition)
        .filter(([k]) => k !== 'margin')
        .reduce((s, [, v]) => s + Number(v), 0) - decomposition.margin
    ) < 1e-10
  );
});
test('carrier, third-slot and bounded clinch formulas have positive prerequisite fixtures', async () => {
  const ctx = fixture();
  ctx.matches = [ctx.matches[0]];
  const m = ctx.matches[0];
  m.details = {
    ...m.details!,
    redRobotTwoBraceState: 0,
    redRobotThreeBraceState: 0,
    redRobotTwoPartnerClimb: true
  };
  const combo = await calculate('D6', ctx);
  assert.equal((combo as any).data[0].value, true);
  const playoff = fixture();
  playoff.rankings[0].rank = 17;
  const third = await calculate('K9', playoff);
  assert.ok((third as any).data.some((r: any) => r.value?.teamKey === 1));
  playoff.alliances.push({
    ...playoff.alliances[0],
    teamKey: 99,
    allianceRank: 3
  });
  const clinch = await calculate('K12', playoff);
  assert.equal(clinch.status, 'ok');
  assert.ok(
    (clinch as any).data.some(
      (r: any) => r.value?.nonPenaltyMaximum !== undefined
    )
  );
});
test('missing audit, source distinctions and incomplete details never become zeros', async () => {
  const ctx = fixture();
  ctx.actions = [];
  ctx.history = [];
  ctx.detailHistory = [];
  for (const id of ['B11', 'C16', 'G14', 'H1', 'M1', 'M8', 'M12', 'M15', 'M22'])
    assert.notEqual((await calculate(id, ctx)).status, 'ok', id);
  const partial = fixture();
  for (const m of partial.matches)
    m.details = {
      eventKey: m.eventKey,
      tournamentKey: m.tournamentKey,
      id: m.id
    };
  assert.notEqual((await calculate('B3', partial)).status, 'ok');
  const legacy = fixture();
  for (const r of legacy.history)
    r.source = ['api', null, 'unknown', undefined][Number(r.revision) % 4];
  assert.equal((await calculate('M22', legacy)).status, 'unavailable');
  const incomplete = fixture();
  for (const m of incomplete.matches)
    m.participants = m.participants!.filter(
      (p) => ![13, 23].includes(p.station)
    );
  assert.notEqual((await calculate('A1', incomplete)).status, 'ok');
});
test('published Bradley-Terry two-team variance and uncertainty update', () => {
  const game = {
      key: 'one',
      red: [1, 2, 3],
      blue: [4, 5, 6],
      redScore: 100,
      blueScore: 90
    },
    r = bradleyTerry([game]);
  const sigma2 = (25 / 3) ** 2 + (25 / 300) ** 2,
    teamVariance = 3 * sigma2,
    c = Math.sqrt(2 * teamVariance + 2 * (25 / 6) ** 2),
    omega = (teamVariance / c) * 0.5,
    delta = (((Math.sqrt(teamVariance) / c) * teamVariance) / (c * c)) * 0.25;
  assert.ok(Math.abs(r[1].mu - (25 + omega / 3)) < 1e-12);
  assert.ok(Math.abs(r[4].mu - (25 - omega / 3)) < 1e-12);
  assert.ok(
    Math.abs(r[1].sigma - Math.sqrt(sigma2) * Math.sqrt(1 - delta / 3)) < 1e-12
  );
});
test('pre-match models never train on the target or later outcomes', async () => {
  const ctx = fixture(),
    changed = structuredClone(ctx),
    target = ctx.matches[3];
  for (const m of changed.matches)
    if (m.actualStartTime >= target.actualStartTime) {
      m.redScore = 9999;
      m.blueScore = 9998;
      if (m.details) m.details.wildfireInRedSuppressionUnit = 10000;
    }
  for (const id of ['A16', 'A17', 'A18', 'A19']) {
    const before = await calculate(id, ctx),
      after = await calculate(id, changed),
      pick = (r: any) =>
        r.data.find(
          (v: any) =>
            v.tournamentKey === target.tournamentKey && v.matchId === target.id
        );
    assert.deepEqual(pick(before), pick(after), id);
  }
});
test('lifecycle replay respects abort and restart clock anchors', () => {
  const ctx = fixture(),
    m = ctx.matches[0],
    key = { eventKey: m.eventKey, tournamentKey: m.tournamentKey, id: m.id };
  ctx.actions.push(
    {
      ...key,
      actionEventId: 9998,
      occurredAtUtc: '2026-09-01T12:00:30.000Z',
      sourceEvent: 'match:abort',
      fieldPath: 'lifecycle',
      newValueJson: JSON.stringify({
        matchState: 7,
        mode: 5,
        timeLeft: 0,
        modeTimeLeft: 0,
        inProgress: false
      })
    },
    {
      ...key,
      actionEventId: 9999,
      occurredAtUtc: '2026-09-01T12:00:50.000Z',
      sourceEvent: 'timer:start',
      fieldPath: 'lifecycle',
      newValueJson: JSON.stringify({
        matchState: 6,
        mode: 2,
        timeLeft: 150,
        modeTimeLeft: 150,
        inProgress: true
      })
    }
  );
  assert.equal(clockAt(ctx, m, '2026-09-01T12:00:40.000Z')!.matchState, 7);
  assert.equal(clockAt(ctx, m, '2026-09-01T12:01:00.000Z')!.timeLeft, 140);
});

test('official season rankings exclude red-card denominator and keep ties out of losses', () => {
  const ctx = fixture(),
    template = ctx.matches[0];
  const matches = [100, 200, 300].map((score, i) => ({
    ...template,
    id: i + 1,
    redScore: score,
    blueScore: 100,
    participants: [
      {
        ...template.participants![0],
        teamKey: 1,
        station: 11,
        cardStatus: i === 1 ? 2 : 0
      }
    ]
  }));
  const [ranking] = IgnitingInnovationSeason.functions!.calculateRankings(
    matches as any,
    []
  );
  assert.equal(ranking.rankingScore, 300);
  assert.equal(ranking.ties, 1);
  assert.equal(ranking.losses, 0);
  matches[2].participants[0].cardStatus = 3;
  assert.equal(
    IgnitingInnovationSeason.functions!.calculateRankings(matches as any, [])[0]
      .rankingScore,
    100
  );
});

test('match selectors retain historical reference observations for live projections', async () => {
  const ctx = fixture();
  ctx.matches = ctx.matches.filter((m) => m.tournamentKey === 'q');
  const target = ctx.matches.find((m) => m.id === 3)!;
  ctx.calculatedAsOfUtc = new Date(
    Date.parse(target.actualStartTime) + 120000
  ).toISOString();
  const all = await calculate('H2', ctx);
  const selected = await calculate('H2', ctx, fixtureParams('H2'), {
    matchId: target.id
  });
  assert.equal(selected.status, 'ok');
  assert.deepEqual(
    (selected as any).data,
    (all as any).data.filter((r: any) => r.matchId === target.id)
  );
});

test('zero default cycle duration and incomplete revision details are unavailable', async () => {
  const ctx = fixture();
  ctx.matches.forEach((m) => (m.cycleTime = 0));
  assert.notEqual((await calculate('I1', ctx)).status, 'ok');
  assert.notEqual((await calculate('I2', ctx)).status, 'ok');
  const replay = fixture(),
    match = replay.matches[0];
  const baseline = replay.detailHistory.find(
    (r) => r.id === match.id && r.tournamentKey === match.tournamentKey
  )!;
  delete baseline.wildfireInRedSuppressionUnit;
  assert.equal(replayAt(replay, match, match.actualStartTime), null);
});

test('playoff simulations stay within each tournament and ties preserve alliance identity', async () => {
  const ctx = fixture();
  const simulation = await calculate('K13', ctx, { samples: 100, seed: 5 });
  assert.equal(simulation.status, 'ok');
  for (const row of (simulation as any).data)
    assert.equal(
      row.advancementProbability,
      1,
      'Both observed alliances advance in each independent tournament'
    );
  const match = ctx.matches.find((m) => m.tournamentKey === 'p')!;
  match.blueScore = match.redScore;
  const table = await calculate('K10', ctx);
  const row = (table as any).data.find(
    (r: any) => r.tournamentKey === 'p' && r.matchId === match.id
  );
  assert.equal(row.redAlliance, 1);
  assert.equal(row.blueAlliance, 2);
});

test('live velocity isolates ball counts and endgame projection freezes at the clock anchor', async () => {
  const ctx = fixture();
  ctx.matches = ctx.matches.filter((m) => m.tournamentKey === 'q');
  const m = ctx.matches[0];
  ctx.calculatedAsOfUtc = new Date(
    Date.parse(m.actualStartTime) + 125000
  ).toISOString();
  const velocity = await calculate('H1', ctx, fixtureParams('H1'), {
    matchId: m.id
  });
  assert.equal(
    (velocity as any).data[0].value,
    0,
    'Brace-only changes do not create ball velocity'
  );
  ctx.calculatedAsOfUtc = '2026-09-01T15:00:00.000Z';
  const projection = await calculate('H14', ctx, fixtureParams('H14'), {
    matchId: m.id
  });
  assert.equal(
    (projection as any).data[0].value.suppressionFrozen,
    152,
    'Later final correction must not change T-30 suppression'
  );
});

test('scheduled strength includes future partners and unknown rookie years stay unknown', async () => {
  const ctx = fixture();
  const before = await calculate('A24', ctx, {}, { teamKey: 1 });
  const scheduled = {
    ...ctx.matches[0],
    id: 1000,
    result: -1,
    participants: ctx.matches[0].participants!.map((p) => ({ ...p, id: 1000 }))
  };
  scheduled.participants[0].teamKey = 1;
  ctx.matches.push(scheduled);
  const after = await calculate('A24', ctx, {}, { teamKey: 1 });
  assert.notEqual((after as any).data[0].value, (before as any).data[0].value);
  ctx.teams[0].rookieYear = 0;
  const rookie = await calculate('J3', ctx, {}, { teamKey: 1 });
  assert.equal((rookie as any).data[0].rookie, null);
});

test('velocity excludes superseded typed values at its window boundary', async () => {
  const ctx = fixture();
  ctx.matches = ctx.matches.filter((m) => m.tournamentKey === 'q');
  ctx.calculatedAsOfUtc = '2026-09-01T12:00:11.000Z';
  const result = await calculate('H1', ctx, fixtureParams('H1'), {
    matchId: 1
  });
  assert.equal((result as any).data[0].value, 15.1);
});
