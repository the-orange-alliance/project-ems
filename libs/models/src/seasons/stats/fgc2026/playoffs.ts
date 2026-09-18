import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient
} from '../types.js';
import { played, identity, officialRankings } from './helpers.js';
import { sum, mean, rng, quantile } from '../util/statistics.js';
export function playoffs(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  if (!ctx.alliances.length)
    return insufficient('Alliance membership is absent');
  const groups = Object.entries(
    Object.groupBy(ctx.alliances, (a) => a.tournamentKey + '|' + a.allianceRank)
  ).map(([key, members]) => ({
    key,
    tournamentKey: members![0].tournamentKey,
    seed: members![0].allianceRank,
    members: members!
  }));
  const appearances = (a: (typeof groups)[number], includeUnplayed = false) =>
    ctx.matches
      .filter(
        (m) =>
          m.tournamentKey === a.tournamentKey &&
          (includeUnplayed || m.result !== -1)
      )
      .flatMap((m) => {
        const p = m.participants?.find((p) =>
          a.members.some((t) => t.teamKey === p.teamKey)
        );
        return p
          ? [
              {
                m,
                score: p.station < 20 ? m.redScore : m.blueScore,
                teams: m
                  .participants!.filter(
                    (x) => x.station < 20 === p.station < 20
                  )
                  .map((x) => x.teamKey)
              }
            ]
          : [];
      });
  const totals = groups
    .map((a) => ({ ...a, total: sum(appearances(a).map((r) => r.score)) }))
    .sort((a, b) => b.total - a.total || a.seed - b.seed);
  const selected = groups.filter(
    (a) => s.allianceSeed === undefined || a.seed === s.allianceSeed
  );
  if (!selected.length) return insufficient('Selected alliance is absent');
  if (id === 10)
    return ok(
      played(ctx).flatMap((m) => {
        const alliance = (red: boolean) =>
          groups.find(
            (a) =>
              a.tournamentKey === m.tournamentKey &&
              m.participants?.some(
                (p) =>
                  p.station < 20 === red &&
                  a.members.some((t) => t.teamKey === p.teamKey)
              )
          )?.seed ?? null;
        const redAlliance = alliance(true),
          blueAlliance = alliance(false);
        return s.allianceSeed !== undefined &&
          redAlliance !== s.allianceSeed &&
          blueAlliance !== s.allianceSeed
          ? []
          : [
              {
                ...identity(m),
                redScore: m.redScore,
                blueScore: m.blueScore,
                redAlliance,
                blueAlliance
              }
            ];
      })
    );
  if (id === 13) {
    const random = rng(p.seed ?? parseInt(ctx.queryHash.slice(0, 8), 16)),
      counts: Record<string, number> = {};
    for (const a of groups)
      if (!appearances(a).length)
        return insufficient(
          'Every alliance needs an observed score distribution'
        );
    for (let i = 0; i < p.samples; i++) {
      const trial = groups
        .map((a) => {
          const past = appearances(a).map((r) => r.score),
            remaining = appearances(a, true).filter((r) => r.m.result === -1);
          return {
            key: a.key,
            tournamentKey: a.tournamentKey,
            seed: a.seed,
            total:
              sum(past) +
              sum(remaining.map(() => past[Math.floor(random() * past.length)]))
          };
        })
        .sort((a, b) => b.total - a.total || a.seed - b.seed);
      for (const tournament of new Set(trial.map((a) => a.tournamentKey)))
        for (const a of trial
          .filter((a) => a.tournamentKey === tournament)
          .slice(0, 2))
          counts[a.key] = (counts[a.key] ?? 0) + 1;
    }
    return ok(
      selected.map((a) => ({
        allianceSeed: a.seed,
        tournamentKey: a.tournamentKey,
        advancementProbability: (counts[a.key] ?? 0) / p.samples,
        samples: p.samples
      })),
      [
        'Seeded bootstrap of remaining scheduled scores; top two advance; seed breaks simulated ties'
      ]
    );
  }
  return ok(
    selected.map((a) => {
      const matches = appearances(a),
        rank =
          totals
            .filter((t) => t.tournamentKey === a.tournamentKey)
            .findIndex((t) => t.key === a.key) + 1,
        total = sum(matches.map((r) => r.score)),
        qual = ctx.rankings.filter(
          (r) =>
            a.members.some((m) => m.teamKey === r.teamKey) &&
            r.tournamentKey !== a.tournamentKey
        ),
        captain = a.members.find((m) => m.isCaptain),
        drawn = [...a.members].sort((a, b) => b.pickOrder - a.pickOrder)[0];
      let value: any = null;
      switch (id) {
        case 1:
          value = matches.length ? total : null;
          break;
        case 2:
          value = matches.length === 4 ? total / 4 : null;
          break;
        case 3:
          value =
            qual.length === a.members.length
              ? sum(qual.map((r) => Number(r.rankingScore)))
              : null;
          break;
        case 4:
          value = matches.length
            ? { seed: a.seed, rank, delta: a.seed - rank }
            : null;
          break;
        case 5:
          value = {
            matches: matches.map((r) => ({
              ...identity(r.m),
              playing: r.teams
            })),
            appearances: a.members.map((t) => ({
              teamKey: t.teamKey,
              count: matches.filter((r) => r.teams.includes(t.teamKey)).length
            }))
          };
          break;
        case 6:
          value =
            matches.length === 4
              ? a.members.map((t) => ({
                  teamKey: t.teamKey,
                  sitOut:
                    4 -
                    matches.filter((r) => r.teams.includes(t.teamKey)).length
                }))
              : null;
          break;
        case 7: {
          const withDrawn = matches.filter((r) =>
              r.teams.includes(drawn.teamKey)
            ),
            without = matches.filter((r) => !r.teams.includes(drawn.teamKey));
          value =
            a.members.length === 4 &&
            a.members.filter((m) => m.pickOrder === drawn.pickOrder).length ===
              1 &&
            withDrawn.length &&
            without.length
              ? {
                  withDrawn: mean(withDrawn.map((r) => r.score)),
                  withoutDrawn: mean(without.map((r) => r.score)),
                  delta:
                    mean(withDrawn.map((r) => r.score))! -
                    mean(without.map((r) => r.score))!
                }
              : null;
          break;
        }
        case 8: {
          const q = qual.find((r) => r.teamKey === captain?.teamKey);
          value =
            captain && q
              ? {
                  captain: captain.teamKey,
                  qualificationRankingScore: q.rankingScore,
                  playoffTotal: total,
                  playoffRank: rank
                }
              : null;
          break;
        }
        case 9: {
          const member = qual.find(
            (r) => Number(r.rank) >= 17 && Number(r.rank) <= 24
          );
          value = member
            ? {
                teamKey: member.teamKey,
                qualificationRankingScore: member.rankingScore,
                meanAllianceScore: mean(
                  matches
                    .filter((m) => m.teams.includes(Number(member.teamKey)))
                    .map((m) => m.score)
                )
              }
            : null;
          break;
        }
        case 11: {
          const finals = matches.filter(
            (r) =>
              ctx.tournaments.find((t) => t.tournamentKey === r.m.tournamentKey)
                ?.tournamentType === 'Finals'
          );
          value = finals.length === 2 ? sum(finals.map((r) => r.score)) : null;
          break;
        }
        case 12: {
          const remaining = appearances(a, true).filter(
              (r) => r.m.result === -1
            ).length,
            third = totals.filter(
              (t) => t.tournamentKey === a.tournamentKey
            )[2];
          value = third
            ? {
                current: total,
                remaining,
                nonPenaltyMaximum: total + remaining * 1065,
                gapToThird: third.total - total,
                eliminatedWithoutPenalties:
                  total + remaining * 1065 < third.total,
                clinched: null,
                reason:
                  'Penalties have no finite score ceiling; unconditional clinch cannot be certified'
              }
            : null;
          break;
        }
        default:
          throw new Error('Unimplemented K' + id);
      }
      return { tournamentKey: a.tournamentKey, allianceSeed: a.seed, value };
    }),
    [
      'Four-match round robin and two-match finals are used only when those prerequisites are satisfied; qualification-close provenance may be absent'
    ]
  );
}
