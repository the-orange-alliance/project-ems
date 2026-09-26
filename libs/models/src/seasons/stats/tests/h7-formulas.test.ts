import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.js';
import { definitions } from '../registry.js';
import { fixtureParams } from '../parameter-schemas.js';
import { defaultMatchDetails } from '../../FGC26_IgnitingInnovation.js';
import type { CalculatorContext } from '../types.js';

const h7 = definitions.find((d) => d.catalogueId === 'H7')!;
const robots = [
  'redRobotOne',
  'redRobotTwo',
  'redRobotThree',
  'blueRobotOne',
  'blueRobotTwo',
  'blueRobotThree'
] as const;
function scenario(red: number, blue: number, extinguisher = 0) {
  const ctx = fixture();
  ctx.matches = [ctx.matches[0]];
  ctx.actions = [];
  ctx.history = [];
  ctx.detailHistory = [];
  const m = ctx.matches[0];
  m.redMinPen = m.redMajPen = m.blueMinPen = m.blueMajPen = 0;
  m.details = {
    ...defaultMatchDetails,
    eventKey: m.eventKey,
    tournamentKey: m.tournamentKey,
    id: m.id,
    wildfireInRedSuppressionUnit: red,
    wildfireInBlueSuppressionUnit: blue,
    wildfireInExtinguisher: extinguisher
  };
  return ctx;
}
async function value(ctx: CalculatorContext, side: number) {
  const result = await h7.compute(
    ctx,
    { ...fixtureParams('H7'), alliance: side === 0 ? 'red' : 'blue' },
    {}
  );
  if (result.status === 'unavailable') {
    assert.match(result.reason, /legal capacity|incomplete/i);
    return null;
  }
  assert.equal(result.status, 'ok');
  return (result as unknown as { data: { value: number | null }[] }).data[0]
    .value;
}
// Independently expressed equation: no scorer, game helper, or derived detail
// fields are used. Separate minor/major awards preserve official float order.
function scores(ctx: CalculatorContext, side: number, n: number) {
  const m = ctx.matches[0],
    d = m.details!;
  const braces = robots.map((r) => Number(d[r + 'BraceState']));
  const bases = [0, 1].map((a) => {
    const own = robots.slice(a * 3, a * 3 + 3);
    const multiplier = own.reduce((v, r) => v + Number(d[r + 'BraceState']), 1);
    const partners = own.filter((r) => d[r + 'PartnerClimb']).length * 25;
    const z3 = braces.filter((b) => b === 0.3).length;
    const coop = z3 >= 6 ? 40 : z3 === 5 ? 25 : z3 === 4 ? 10 : 0;
    return (
      (Number(
        d[
          a === 0
            ? 'wildfireInRedSuppressionUnit'
            : 'wildfireInBlueSuppressionUnit'
        ]
      ) +
        (side === a ? n : 0)) *
        multiplier +
      partners +
      Number(d.wildfireInExtinguisher) +
      coop
    );
  });
  return [
    Math.ceil(
      bases[0] + m.blueMajPen * 0.1 * bases[1] + m.blueMinPen * 0.05 * bases[1]
    ),
    Math.ceil(
      bases[1] + m.redMajPen * 0.1 * bases[0] + m.redMinPen * 0.05 * bases[0]
    )
  ];
}
function oracle(ctx: CalculatorContext, side: number) {
  const d = ctx.matches[0].details!;
  const capacity =
    500 -
    Number(d.wildfireInRedSuppressionUnit) -
    Number(d.wildfireInBlueSuppressionUnit) -
    Number(d.wildfireInExtinguisher);
  for (let n = 0; n <= capacity; n++) {
    const s = scores(ctx, side, n);
    if (s[side] > s[1 - side]) return n;
  }
  return null;
}

test('H7 hand calculations: strict ties, minor/major feedback and capacity', async () => {
  const cases = [
    { red: 11, blue: 10, expected: 0 },
    { red: 10, blue: 10, expected: 1 },
    { red: 9, blue: 10, expected: 2 }, // N=1 only ties; old ceil gave 1.
    { red: 10, blue: 10, minor: 1, expected: 2 }, // 11 vs ceil(10+.55)=11; 12 vs 11.
    { red: 10, blue: 10, major: 1, expected: 3 }, // 12 vs ceil(10+1.2)=12; 13 vs 12.
    { red: 10, blue: 10, minor: 1, major: 1, expected: 3 }, // 13 vs ceil(11.95)=12.
    { red: 10, blue: 10, opponentMajor: 1, expected: 0 }, // 11 vs 10.
    { red: 0, blue: 249, extinguisher: 1, expected: 250 }, // Last legal ball: 251 vs 250.
    { red: 0, blue: 250, expected: null }, // All 250 remaining balls only tie.
    { red: 250, blue: 250, expected: null },
    { red: 251, blue: 249, expected: 0 },
    { red: 10, blue: 10, major: 10, expected: null }, // Opponent = ceil(20+N).
    { red: 10, blue: 10, major: 11, expected: null }
  ];
  for (const c of cases)
    for (const side of [0, 1]) {
      const ctx = scenario(
        side === 0 ? c.red : c.blue,
        side === 0 ? c.blue : c.red,
        c.extinguisher ?? 0
      );
      const m = ctx.matches[0];
      if (side === 0) {
        m.redMinPen = c.minor ?? 0;
        m.redMajPen = c.major ?? 0;
        m.blueMajPen = c.opponentMajor ?? 0;
      } else {
        m.blueMinPen = c.minor ?? 0;
        m.blueMajPen = c.major ?? 0;
        m.redMajPen = c.opponentMajor ?? 0;
      }
      assert.equal(oracle(ctx, side), c.expected, JSON.stringify(c));
      assert.equal(await value(ctx, side), c.expected, JSON.stringify(c));
    }
});

test('H7 brace boundaries, derived zero multiplier, cards and incomplete data', async () => {
  for (const brace of [0, 0.05, 0.1, 0.2, 0.3]) {
    const ctx = scenario(0, 1);
    ctx.matches[0].details!.redRobotOneBraceState = brace;
    // Minimum legal multiplier 1 needs 2 balls; any increment needs 1.
    assert.equal(await value(ctx, 0), brace === 0 ? 2 : 1);
  }
  const maximum = scenario(10, 20);
  for (const r of robots.slice(0, 3))
    maximum.matches[0].details![r + 'BraceState'] = 0.3;
  assert.equal(await value(maximum, 0), 1); // ceil(11*1.9)=21 > 20.
  const ctx = scenario(10, 10);
  ctx.matches[0].details!.redClimbMultiplier = 0; // Cached field is not the actual multiplier.
  assert.equal(await value(ctx, 0), 1);
  for (const card of [0, 1, 2, 3]) {
    ctx.matches[0].participants!.forEach((p) => {
      p.cardStatus = card;
      p.disqualified = 1;
    });
    assert.equal(await value(ctx, 0), 1);
  }
  delete ctx.matches[0].details!.redRobotOneBraceState;
  assert.equal(await value(ctx, 0), null);
  ctx.matches[0].details = undefined;
  assert.equal(await value(ctx, 1), null);
  assert.equal(await value(scenario(300, 201), 0), null);
});

test('H7 independent bounded oracle and minimality across both alliances', async () => {
  for (let i = 0; i < 120; i++) {
    const ctx = scenario((i * 17) % 220, (i * 31) % 220, i % 21);
    const m = ctx.matches[0];
    m.redMinPen = i % 5;
    m.blueMinPen = i % 3;
    m.redMajPen = i % 13;
    m.blueMajPen = i % 7;
    robots.forEach((r, j) => {
      m.details![r + 'BraceState'] = [0, 0.1, 0.2, 0.3][(i + j) % 4];
      m.details![r + 'PartnerClimb'] = (i + j) % 5 === 0;
    });
    const before = structuredClone(ctx);
    for (const side of [0, 1]) {
      const n = await value(ctx, side);
      assert.equal(n, oracle(ctx, side), `case ${i}, side ${side}`);
      if (n !== null) {
        const at = scores(ctx, side, n);
        assert.ok(at[side] > at[1 - side]);
        for (let earlier = 0; earlier < n; earlier++) {
          const prior = scores(ctx, side, earlier);
          assert.ok(prior[side] <= prior[1 - side]);
        }
      }
      assert.equal(await value(ctx, side), n);
    }
    assert.deepEqual(ctx, before, 'Input is not mutated');
  }
});

test('H7 rounded lead can disappear after the first winning candidate', async () => {
  for (const side of [0, 1]) {
    const ctx = scenario(side === 0 ? 0 : 1, side === 0 ? 1 : 0);
    const m = ctx.matches[0];
    m.details![
      side === 0 ? 'redRobotOneBraceState' : 'blueRobotOneBraceState'
    ] = 0.1;
    if (side === 0) m.redMinPen = 19;
    else m.blueMinPen = 19;
    // n=20: ceil(22)=22 vs ceil(1+.95*22)=22, tie.
    // n=21: ceil(23.1)=24 vs ceil(1+.95*23.1)=23, lead.
    // n=23: ceil(25.3)=26 vs ceil(1+.95*25.3)=26, tie again.
    assert.equal(await value(ctx, side), 21);
    for (const [n, leads] of [
      [20, false],
      [21, true],
      [23, false]
    ] as const) {
      const s = scores(ctx, side, n);
      assert.equal(s[side] > s[1 - side], leads);
    }
  }
});

test('H7 mixed results preserve impossible and incomplete rows as null', async () => {
  const ctx = scenario(11, 10);
  const impossible = structuredClone(scenario(250, 250).matches[0]);
  impossible.id = 2;
  impossible.details!.id = 2;
  const incomplete = structuredClone(ctx.matches[0]);
  incomplete.id = 3;
  incomplete.details = undefined;
  ctx.matches.push(impossible, incomplete);
  const result = await h7.compute(ctx, fixtureParams('H7'), {});
  assert.equal(result.status, 'ok');
  assert.deepEqual(
    (result as unknown as { data: { value: number | null }[] }).data.map(
      (r) => r.value
    ),
    [0, null, null]
  );
});
