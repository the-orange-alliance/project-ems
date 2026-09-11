import {
  FGC26MatchDetailsZod,
  calculateScore,
  calculateRankingPoints,
  ScoreTable
} from '../../FGC26_IgnitingInnovation.js';
import {
  type StatMatch,
  type CalculatorContext,
  type Json,
  ownAlliance,
  keyOf
} from '../types.js';
import { mean, sum } from '../util/statistics.js';
export const played = (ctx: CalculatorContext) =>
  ctx.matches
    .filter((m) => m.result !== -1)
    .sort(
      (a, b) =>
        a.actualStartTime.localeCompare(b.actualStartTime) ||
        a.tournamentKey.localeCompare(b.tournamentKey) ||
        a.id - b.id
    );
export const teamMatches = (ctx: CalculatorContext, t: number) =>
  played(ctx).filter((m) => m.participants?.some((p) => p.teamKey === t));
export const fields = [
  'redRobotOne',
  'redRobotTwo',
  'redRobotThree',
  'blueRobotOne',
  'blueRobotTwo',
  'blueRobotThree'
] as const;
export const robotKey = (station: number) =>
  fields[[11, 12, 13, 21, 22, 23].indexOf(station)];
export function game(m: StatMatch) {
  if (
    !m.details ||
    Object.keys(FGC26MatchDetailsZod.shape).some(
      (k) => m.details![k] === undefined || m.details![k] === null
    )
  )
    return null;
  const parsed = FGC26MatchDetailsZod.safeParse(m.details);
  if (!parsed.success) return null;
  const d = calculateRankingPoints(parsed.data),
    score = calculateScore({ ...m, details: d });
  const braces = fields.map(
      (k) => d[(k + 'BraceState') as keyof typeof d] as number
    ),
    partners = fields.map(
      (k) => d[(k + 'PartnerClimb') as keyof typeof d] as boolean
    );
  const supp = [
      d.wildfireInRedSuppressionUnit,
      d.wildfireInBlueSuppressionUnit
    ],
    mult = [d.redClimbMultiplier, d.blueClimbMultiplier],
    partner = [d.redPartnerClimbPoints, d.bluePartnerClimbPoints],
    exting = d.wildfireInExtinguisher,
    coop = d.coopertition;
  const pre = supp.map((s, i) => s * mult[i] + partner[i] + exting + coop);
  const foul = [
    pre[1] * (m.blueMinPen * 0.05 + m.blueMajPen * 0.1),
    pre[0] * (m.redMinPen * 0.05 + m.redMajPen * 0.1)
  ];
  return {
    d,
    braces,
    partners,
    supp,
    mult,
    partner,
    exting,
    coop,
    pre,
    foul,
    score,
    raw: pre.map((v, i) => v + foul[i]),
    total: sum(supp) + exting,
    z3: braces.filter((v) => v === 0.3).length
  };
}
export const eligibleScores = (ctx: CalculatorContext, t: number) =>
  teamMatches(ctx, t).flatMap((m) => {
    const p = m.participants!.find((p) => p.teamKey === t)!;
    if (p.surrogate || p.disqualified || p.cardStatus === 2) return [];
    return [
      {
        m,
        score:
          p.cardStatus === 3 ? 0 : p.station < 20 ? m.redScore : m.blueScore,
        p
      }
    ];
  });
export function rankingAverage(scores: number[]) {
  const sorted = [...scores].sort((a, b) => a - b);
  const average = mean(sorted.length > 1 ? sorted.slice(1) : sorted);
  return average === null ? null : Math.round(average * 100) / 100;
}
export function officialRankings(ctx: CalculatorContext) {
  return ctx.teams
    .flatMap((t) => {
      const rows = eligibleScores(ctx, t.teamKey);
      if (!rows.length) return [];
      const sorted = [...rows].sort(
          (a, b) =>
            a.score - b.score ||
            a.m.actualStartTime.localeCompare(b.m.actualStartTime)
        ),
        kept = sorted.length > 1 ? sorted.slice(1) : sorted;
      return [
        {
          teamKey: t.teamKey,
          rankingScore: Math.round(mean(kept.map((r) => r.score))! * 100) / 100,
          highestScore: Math.max(...rows.map((r) => r.score)),
          climbPoints: sum(
            rows.map((r) =>
              r.p.cardStatus <= 1
                ? Number(
                    r.m.details?.[robotKey(r.p.station) + 'BraceState'] ?? 0
                  )
                : 0
            )
          ),
          rank: 0,
          rankChange: 0,
          played: rows.length
        }
      ];
    })
    .sort(
      (a, b) =>
        b.rankingScore - a.rankingScore ||
        b.highestScore - a.highestScore ||
        b.climbPoints - a.climbPoints ||
        a.teamKey - b.teamKey
    )
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      rankChange:
        Number(
          ctx.rankings.find((p) => p.teamKey === r.teamKey)?.rank ?? i + 1
        ) -
        (i + 1)
    }));
}
export const gameMatches = (ctx: CalculatorContext) =>
  played(ctx).flatMap((m) => {
    const g = game(m);
    return g ? [{ m, g }] : [];
  });
export const identity = (m: StatMatch) => ({
  eventKey: m.eventKey,
  tournamentKey: m.tournamentKey,
  matchId: m.id
});
export function mapMatch(
  ctx: CalculatorContext,
  fn: (m: StatMatch, g: NonNullable<ReturnType<typeof game>>) => Json
) {
  return gameMatches(ctx).map(({ m, g }) => ({
    ...identity(m),
    value: fn(m, g)
  }));
}
export const memberStates = (ctx: CalculatorContext, t: number) =>
  teamMatches(ctx, t).flatMap((m) => {
    const p = m.participants!.find((p) => p.teamKey === t)!,
      g = game(m),
      i = [11, 12, 13, 21, 22, 23].indexOf(p.station);
    return g && i >= 0
      ? [
          {
            m,
            p,
            g,
            i,
            side: i < 3 ? 0 : 1,
            brace: g.braces[i],
            partner: g.partners[i]
          }
        ]
      : [];
  });
export const selectedTeams = (ctx: CalculatorContext) =>
  ctx.teams.map((t) => t.teamKey);
