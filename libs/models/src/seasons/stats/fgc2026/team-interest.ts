import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient,
  resolveTeamKeys
} from '../types.js';
import {
  officialRankings,
  teamMatches,
  memberStates,
  identity,
  played
} from './helpers.js';
import { mean, slope, sum } from '../util/statistics.js';
import { countries } from './countries.js';
export function teamInterest(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const resolvedTeamKeys = new Set(
    resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey))
  );
  const teams = ctx.teams.filter((t) => resolvedTeamKeys.has(t.teamKey));
  if (!teams.length) return insufficient('No teams');
  const scores = (t: number) =>
      teamMatches(ctx, t).map((m) => ({
        m,
        score:
          m.participants!.find((p) => p.teamKey === t)!.station < 20
            ? m.redScore
            : m.blueScore
      })),
    year = Number(ctx.seasonKey.match(/\d{4}/)?.[0]),
    ranks = officialRankings(ctx);
  switch (id) {
    case 1:
      return ok(
        teams.map((t) => ({
          teamKey: t.teamKey,
          country: t.country || null,
          countryCode: t.countryCode || null
        }))
      );
    case 2:
      return ok(
        teams.map((t) => ({
          teamKey: t.teamKey,
          robotName: t.robotName || null
        }))
      );
    case 3:
      return Number.isFinite(year)
        ? ok(
            teams.map((t) => ({
              teamKey: t.teamKey,
              rookie: t.rookieYear > 0 ? t.rookieYear === year : null
            }))
          )
        : insufficient('Authoritative season has no season year');
    case 4: {
      const a = ranks.filter((r) =>
        teams.some((t) => t.teamKey === r.teamKey && t.rookieYear === year)
      );
      return a.length
        ? ok(a[0])
        : insufficient('No rookie with eligible ranking matches');
    }
    case 5: {
      const a = teams
        .flatMap((t) => {
          const first = scores(t.teamKey)[0];
          return first
            ? [{ teamKey: t.teamKey, ...identity(first.m), score: first.score }]
            : [];
        })
        .sort((a, b) => b.score - a.score);
      return a.length ? ok(a[0]) : insufficient();
    }
    case 6: {
      const a = teams.flatMap((t) => {
        const rank = ranks.find((r) => r.teamKey === t.teamKey),
          country = countries.find(
            (c) => c.code === t.countryCode.toUpperCase()
          );
        return rank
          ? [
              {
                country: t.country || 'unknown',
                continent: country?.continent ?? 'unknown',
                rankingScore: rank.rankingScore
              }
            ]
          : [];
      });
      return a.length
        ? ok({
            countries: Object.entries(Object.groupBy(a, (t) => t.country)).map(
              ([country, r]) => ({
                country,
                meanRankingScore: mean(r!.map((r) => r.rankingScore))
              })
            ),
            continents: Object.entries(
              Object.groupBy(a, (t) => t.continent)
            ).map(([continent, r]) => ({
              continent,
              meanRankingScore: mean(r!.map((r) => r.rankingScore))
            }))
          })
        : insufficient();
    }
    case 7: {
      if (p.countries?.length !== 2)
        return insufficient('Exactly two countries are required');
      const a = played(ctx).flatMap((m) => {
        const red = (m.participants ?? [])
            .filter((t) => t.station < 20)
            .map(
              (t) => ctx.teams.find((x) => x.teamKey === t.teamKey)?.country
            ),
          blue = (m.participants ?? [])
            .filter((t) => t.station >= 20)
            .map(
              (t) => ctx.teams.find((x) => x.teamKey === t.teamKey)?.country
            );
        const sides = [
          red.includes(p.countries![0]) && blue.includes(p.countries![1]),
          blue.includes(p.countries![0]) && red.includes(p.countries![1])
        ];
        return sides.flatMap((present, i) =>
          present
            ? [
                {
                  ...identity(m),
                  outcome: Math.sign(
                    (m.redScore - m.blueScore) * (i === 0 ? 1 : -1)
                  )
                }
              ]
            : []
        );
      });
      return a.length
        ? ok({
            countries: p.countries,
            wins: a.filter((x) => x.outcome > 0).length,
            losses: a.filter((x) => x.outcome < 0).length,
            ties: a.filter((x) => x.outcome === 0).length
          })
        : insufficient('Countries have no opposing appearances');
    }
    case 8:
    case 9:
      return ok(
        teams
          .filter((t) => {
            const a = memberStates(ctx, t.teamKey);
            return (
              a.length &&
              a.every((r) => (id === 8 ? r.brace === 0 : r.brace > 0))
            );
          })
          .map((t) => ({ teamKey: t.teamKey }))
      );
    case 10: {
      const a = teams
        .map((t) => ({
          teamKey: t.teamKey,
          slope: slope(scores(t.teamKey).map((r) => r.score))
        }))
        .filter((r) => r.slope !== null)
        .sort((a, b) => b.slope! - a.slope!);
      return a.length
        ? ok(a[0])
        : insufficient('At least two appearances are required');
    }
    case 11:
      return ok(
        teams.map((t) => {
          const partners = teamMatches(ctx, t.teamKey).flatMap((m) => {
              const own = m.participants!.find((p) => p.teamKey === t.teamKey)!;
              return m
                .participants!.filter(
                  (p) =>
                    p.teamKey !== t.teamKey &&
                    p.station < 20 === own.station < 20
                )
                .map((p) => p.teamKey);
            }),
            counts = Object.entries(Object.groupBy(partners, (x) => x))
              .map(([teamKey, p]) => ({
                teamKey: Number(teamKey),
                count: p!.length
              }))
              .sort((a, b) => b.count - a.count || a.teamKey - b.teamKey);
          return {
            teamKey: t.teamKey,
            partners: counts.length
              ? counts.filter((x) => x.count === counts[0].count)
              : []
          };
        })
      );
    case 12:
      return ok(
        teams.flatMap((a, i) =>
          teams
            .slice(i + 1)
            .filter(
              (b) =>
                !played(ctx).some(
                  (m) =>
                    m.participants?.some((p) => p.teamKey === a.teamKey) &&
                    m.participants?.some((p) => p.teamKey === b.teamKey)
                )
            )
            .map((b) => ({ teamKeys: [a.teamKey, b.teamKey] }))
        )
      );
    case 13:
      return ok(
        teams.map((t) => {
          const a = scores(t.teamKey).sort((a, b) => a.score - b.score);
          return {
            teamKey: t.teamKey,
            worst: a.length
              ? { ...identity(a[0].m), name: a[0].m.name, score: a[0].score }
              : null,
            best: a.length
              ? {
                  ...identity(a.at(-1)!.m),
                  name: a.at(-1)!.m.name,
                  score: a.at(-1)!.score
                }
              : null
          };
        })
      );
    case 14:
      return ok(
        teams.map((t) => ({
          teamKey: t.teamKey,
          wins: scores(t.teamKey).filter(
            (r) => r.score > Math.min(r.m.redScore, r.m.blueScore)
          ).length
        }))
      );
    case 15: {
      const a = teams.flatMap((t) => {
        const c = countries.find((c) => c.code === t.countryCode.toUpperCase());
        return c
          ? [
              {
                teamKey: t.teamKey,
                country: c.name,
                latitude: c.latitude,
                area: c.area
              }
            ]
          : [];
      });
      return a.length
        ? ok(
            {
              northernmost: [...a].sort((a, b) => b.latitude - a.latitude)[0],
              southernmost: [...a].sort((a, b) => a.latitude - b.latitude)[0],
              smallestNation: [...a].sort((a, b) => a.area - b.area)[0]
            },
            [
              'Geography dataset v1 uses country centroids and land area, not robot or team coordinates'
            ]
          )
        : insufficient('No country is recognized by the static dataset');
    }
    default:
      throw new Error('Unimplemented J' + id);
  }
}
