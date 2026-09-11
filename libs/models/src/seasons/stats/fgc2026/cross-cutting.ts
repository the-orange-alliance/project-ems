import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient,
  resolveTeamKeys
} from '../types.js';
import {
  gameMatches,
  identity,
  officialRankings,
  eligibleScores,
  memberStates
} from './helpers.js';
import { calculateScore } from '../../FGC26_IgnitingInnovation.js';
import { ratingMatches } from '../generic/index.js';
import { opr } from '../generic/linear-models.js';
import { sum, mean, std, pearson, histogram } from '../util/statistics.js';
export function crossCutting(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey)),
    side = p.alliance === 'red' ? 0 : 1;
  const decomposition = (g: (typeof games)[number]['g']) => ({
    suppressionMultiplier: g.supp[0] * g.mult[0] - g.supp[1] * g.mult[1],
    partner: g.partner[0] - g.partner[1],
    fouls: g.foul[0] - g.foul[1],
    rounding: g.score[0] - g.raw[0] - (g.score[1] - g.raw[1])
  });
  if ([1, 2, 3, 4, 7, 14].includes(id))
    return ok(
      games.map(({ m, g }) => {
        let value: any;
        switch (id) {
          case 1:
            value = { ...decomposition(g), margin: g.score[0] - g.score[1] };
            break;
          case 2:
            value = {
              extinguisher: g.exting,
              coopertition: g.coop,
              shared: g.exting + g.coop,
              directMarginContribution: 0,
              penaltyCaveat:
                'Opponent-scaled fouls and ceiling rounding can transmit shared points into margin indirectly'
            };
            break;
          case 3:
          case 4: {
            const details = { ...g.d };
            if (id === 3) details.wildfireInExtinguisher += g.coop;
            for (const field of Object.keys(details))
              if (field.endsWith(id === 3 ? 'BraceState' : 'PartnerClimb'))
                (details as any)[field] = id === 3 ? 0 : false;
            const score = calculateScore({ ...m, details });
            value = {
              red: score[0],
              blue: score[1],
              resultChanged:
                Math.sign(score[0] - score[1]) !==
                Math.sign(m.redScore - m.blueScore)
            };
            break;
          }
          case 7:
            value = {
              zone3Value: g.supp[side] * 0.3,
              additionalBalls: p.balls,
              climbWorthMore: g.supp[side] * 0.3 > p.balls
            };
            break;
          case 14: {
            const terms = Object.entries(decomposition(g))
              .filter(([k]) => k !== 'rounding')
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
            value = { term: terms[0][0], points: terms[0][1] };
            break;
          }
        }
        return { ...identity(m), value };
      })
    );
  if (id === 5 || id === 6) {
    const rows = games.flatMap(({ m, g }) =>
      [0, 1].map((i) => ({
        bucket:
          id === 5
            ? Math.round(g.mult[i] * 100) / 100
            : Math.floor((g.supp[i] - g.supp[1 - i]) / 25) * 25,
        win: g.score[i] > g.score[1 - i] ? 1 : 0,
        tie: g.score[i] === g.score[1 - i] ? 1 : 0
      }))
    );
    return ok(
      Object.entries(Object.groupBy(rows, (r) => r.bucket)).map(
        ([bucket, a]) => ({
          bucket: Number(bucket),
          winRate: mean(a!.map((r) => r.win)),
          matches: a!.length,
          ties: sum(a!.map((r) => r.tie))
        })
      )
    );
  }
  if (id === 8 || id === 9)
    return ok(
      keys.map((teamKey) => {
        const a = eligibleScores(ctx, teamKey).sort(
          (a, b) => a.score - b.score
        );
        return {
          teamKey,
          value:
            a.length > 1
              ? id === 8
                ? { ...identity(a[0].m), score: a[0].score }
                : a[1].score
              : null
        };
      })
    );
  const ranks = officialRankings(ctx);
  if (id === 10)
    return ok(
      keys.map((teamKey) => {
        const r = ranks.find((r) => r.teamKey === teamKey),
          above = r ? ranks.find((a) => a.rank === r.rank - 1) : null,
          scores = eligibleScores(ctx, teamKey);
        return {
          teamKey,
          points:
            above && r && scores.length
              ? Math.max(
                  1,
                  Math.ceil(
                    (above.rankingScore - r.rankingScore) *
                      Math.max(1, scores.length - 1) +
                      0.01
                  )
                )
              : null
        };
      })
    );
  if (id === 11)
    return ok(
      [8, 24, 25].map((boundary) => {
        const threshold = ranks.find((r) => r.rank === boundary);
        return {
          boundary,
          teams: threshold
            ? ranks
                .filter((r) => {
                  const scores = eligibleScores(ctx, r.teamKey).map(
                      (v) => v.score
                    ),
                    best = [...scores, 1065].sort((a, b) => a - b).slice(1),
                    worst = [...scores, 0].sort((a, b) => a - b).slice(1);
                  return r.rank > boundary
                    ? mean(best)! >= threshold.rankingScore
                    : mean(worst)! <= threshold.rankingScore;
                })
                .map((r) => ({
                  teamKey: r.teamKey,
                  rank: r.rank,
                  rankingScore: r.rankingScore
                }))
            : []
        };
      }),
      [
        'One additional match ranges from zero to the 1065-point penalty-free schema ceiling; other teams are held fixed, and tied boundaries are included optimistically'
      ]
    );
  const matches = ratingMatches(ctx);
  if (!matches.length) return insufficient();
  const fit = opr(
    matches.flatMap((m) => [
      { teams: m.red, score: m.redScore, opponentScore: m.blueScore },
      { teams: m.blue, score: m.blueScore, opponentScore: m.redScore }
    ])
  );
  if (id === 12)
    return ok(
      keys.map((teamKey) => ({
        teamKey,
        spread: std(
          matches
            .filter((m) => [...m.red, ...m.blue].includes(teamKey))
            .flatMap((m) =>
              (m.red.includes(teamKey) ? m.red : m.blue)
                .filter((t) => t !== teamKey)
                .map((t) => fit.ratings[t])
            )
        )
      }))
    );
  if (id === 13) {
    const rows = ranks.flatMap((r) => {
        const states = memberStates(ctx, r.teamKey),
          a = matches.filter((m) => [...m.red, ...m.blue].includes(r.teamKey));
        return states.length && a.length
          ? [
              {
                climb: states.filter((r) => r.brace > 0).length / states.length,
                opr: fit.ratings[r.teamKey],
                ranking: r.rankingScore,
                win:
                  a.filter(
                    (m) =>
                      (m.red.includes(r.teamKey)
                        ? m.redScore - m.blueScore
                        : m.blueScore - m.redScore) > 0
                  ).length / a.length
              }
            ]
          : [];
      }),
      metrics = ['climb', 'opr', 'ranking', 'win'] as const;
    return rows.length >= 2
      ? ok({
          metrics,
          matrix: metrics.map((a) =>
            metrics.map((b) =>
              pearson(
                rows.map((r) => r[a]),
                rows.map((r) => r[b])
              )
            )
          )
        } as any)
      : insufficient();
  }
  throw new Error('Unimplemented L' + id);
}
