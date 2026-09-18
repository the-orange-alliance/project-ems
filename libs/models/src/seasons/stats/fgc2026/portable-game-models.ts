import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  type StatResult,
  ok,
  insufficient,
  keyOf,
  resolveTeamKeys
} from '../types.js';
import {
  gameMatches,
  officialRankings,
  eligibleScores,
  memberStates
} from './helpers.js';
import { ratingMatches } from '../generic/index.js';
import { opr } from '../generic/linear-models.js';
import { ratings } from '../generic/rating-models.js';
import { mean, std, sum } from '../util/statistics.js';
export function computeGameModel(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
): StatResult {
  const valid = new Set(ratingMatches(ctx).map((m) => m.key));
  const games = gameMatches(ctx).filter(({ m }) => valid.has(keyOf(m)));
  if (
    !games.length ||
    (s.teamKey !== undefined &&
      !games.some(({ m }) =>
        m.participants?.some((t) => t.teamKey === s.teamKey)
      ))
  )
    return insufficient();
  const keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey)),
    rows = (f: (t: number) => any) =>
      ok(keys.map((teamKey) => ({ teamKey, value: f(teamKey) })));
  if ([2, 3, 4, 5].includes(id)) {
    const observations = games.flatMap(({ m, g }) =>
      id === 5
        ? [
            {
              teams: m.participants!.map((p) => p.teamKey),
              score: g.exting,
              opponentScore: 0
            }
          ]
        : [0, 1].map((i) => ({
            teams: m
              .participants!.filter((p) => p.station < 20 === (i === 0))
              .map((p) => p.teamKey),
            score:
              id === 2
                ? g.supp[i]
                : id === 3
                  ? g.supp[i] * g.mult[i]
                  : g.mult[i] - 1,
            opponentScore: 0
          }))
    );
    const fit = opr(observations);
    return ok(
      {
        teams: keys.map((teamKey) => ({
          teamKey,
          value: fit.ratings[teamKey] ?? null
        })),
        rank: fit.rank,
        columns: fit.columns
      },
      fit.underdetermined
        ? ['Rank-deficient schedule; minimum-norm estimate']
        : []
    );
  }
  const component = (
    component: 'suppression' | 'climb' | 'partner',
    training = games
  ) =>
    ratings(
      training.map(({ m, g }) => ({
        key: keyOf(m),
        red: m
          .participants!.filter((p) => p.station < 20)
          .map((p) => p.teamKey),
        blue: m
          .participants!.filter((p) => p.station >= 20)
          .map((p) => p.teamKey),
        redScore:
          component === 'suppression'
            ? g.supp[0]
            : component === 'climb'
              ? g.mult[0] - 1
              : g.partner[0],
        blueScore:
          component === 'suppression'
            ? g.supp[1]
            : component === 'climb'
              ? g.mult[1] - 1
              : g.partner[1]
      }))
    );
  switch (id) {
    case 11: {
      const a = component('suppression'),
        b = component('climb'),
        c = component('partner');
      return rows((t) =>
        a.ratings[t] === undefined
          ? null
          : {
              suppression: a.ratings[t],
              climb: b.ratings[t],
              partner: c.ratings[t]
            }
      );
    }
    case 17: {
      return ok(
        ctx.matches
          .filter((m) => s.matchId === undefined || m.id === s.matchId)
          .map((m) => {
            const training = games.filter(
              (x) =>
                keyOf(x.m) !== keyOf(m) &&
                (m.result === -1 || x.m.actualStartTime < m.actualStartTime)
            );
            const a = component('suppression', training),
              b = component('climb', training),
              c = component('partner', training),
              shared = mean(training.map((x) => x.g.exting + x.g.coop));
            return {
              tournamentKey: m.tournamentKey,
              matchId: m.id,
              value: [true, false].map((red) => {
                const teams = (m.participants ?? [])
                  .filter((p) => p.station < 20 === red)
                  .map((p) => p.teamKey);
                return shared !== null &&
                  teams.length === 3 &&
                  teams.every((t) => a.ratings[t] !== undefined)
                  ? sum(teams.map((t) => a.ratings[t])) *
                      (1 + sum(teams.map((t) => b.ratings[t]))) +
                      sum(teams.map((t) => c.ratings[t])) +
                      shared
                  : null;
              })
            };
          }),
        [
          'Component predictions train only on earlier matches; penalties excluded and shared terms enter once'
        ]
      );
    }
    case 26: {
      const ranks = officialRankings(ctx),
        a = component('suppression'),
        b = component('climb'),
        c = component('partner');
      return rows((t) => {
        const actual = ranks.find((r) => r.teamKey === t);
        const eligible = eligibleScores(ctx, t);
        if (
          eligible.some(({ m }) => !games.some((x) => keyOf(x.m) === keyOf(m)))
        )
          return null;
        const expected = eligible
          .map(({ m, p }) => {
            const teams = m
                .participants!.filter((x) => x.station < 20 === p.station < 20)
                .map((p) => p.teamKey),
              { g } = games.find((x) => keyOf(x.m) === keyOf(m))!;
            return (
              sum(teams.map((t) => a.ratings[t])) *
                (1 + sum(teams.map((t) => b.ratings[t]))) +
              sum(teams.map((t) => c.ratings[t])) +
              g.exting +
              g.coop
            );
          })
          .sort((a, b) => a - b);
        return actual && expected.length
          ? actual.rankingScore -
              mean(expected.length > 1 ? expected.slice(1) : expected)!
          : null;
      });
    }
    case 29:
    case 30: {
      const r = officialRankings(ctx);
      return rows((t) => {
        const row = r.find((r) => r.teamKey === t);
        return row
          ? id === 29
            ? row.rankingScore
            : { rank: row.rank, rankChange: row.rankChange }
          : null;
      });
    }
    case 31: {
      const history: Record<number, number[]> = {};
      for (let i = 1; i <= games.length; i++)
        for (const r of officialRankings({
          ...ctx,
          matches: games.slice(0, i).map((x) => x.m)
        }))
          (history[r.teamKey] ??= []).push(r.rank);
      return rows((t) => std(history[t] ?? []));
    }
    case 32:
      return rows((t) => {
        const scores = eligibleScores(ctx, t)
          .filter((r) => r.p.cardStatus <= 1)
          .map((r) => r.score);
        return scores.length ? Math.max(...scores) : null;
      });
    case 33:
      return rows((t) => {
        const a = memberStates(ctx, t).filter(
          (r) => !r.p.surrogate && !r.p.disqualified && r.p.cardStatus <= 1
        );
        return a.length ? sum(a.map((r) => r.brace)) : null;
      });
    default:
      throw new Error('Unimplemented FGC2026 model A' + id);
  }
}
