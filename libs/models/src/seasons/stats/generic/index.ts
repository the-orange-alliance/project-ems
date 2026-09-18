import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  type StatResult,
  ok,
  insufficient,
  unavailable,
  keyOf,
  resolveTeamKeys,
  type Json
} from '../types.js';
import { opr, iterativeOpr } from './linear-models.js';
import { ratings, bradleyTerry, type RatingMatch } from './rating-models.js';
import {
  mean,
  median,
  std,
  sum,
  slope,
  quantile,
  rng,
  logistic
} from '../util/statistics.js';
export function ratingMatches(ctx: CalculatorContext): RatingMatch[] {
  return ctx.matches
    .filter((m) => m.result !== -1)
    .sort(
      (a, b) =>
        a.actualStartTime.localeCompare(b.actualStartTime) ||
        a.tournamentKey.localeCompare(b.tournamentKey) ||
        a.id - b.id
    )
    .flatMap((m) => {
      const p = m.participants ?? [],
        red = p.filter((p) => p.station < 20),
        blue = p.filter((p) => p.station >= 20);
      if (
        !red.length ||
        (ctx.teamsPerAlliance !== undefined &&
          red.length !== ctx.teamsPerAlliance) ||
        red.length !== blue.length ||
        p.some((p) => p.disqualified) ||
        new Set(p.map((p) => p.teamKey)).size !== p.length
      )
        return [];
      return [
        {
          red: red.map((p) => p.teamKey),
          blue: blue.map((p) => p.teamKey),
          redScore: m.redScore,
          blueScore: m.blueScore,
          key: keyOf(m)
        }
      ];
    });
}
export function computeGeneric(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
): StatResult {
  const matches = ratingMatches(ctx);
  if (
    !matches.length ||
    (s.teamKey !== undefined &&
      !matches.some((m) => [...m.red, ...m.blue].includes(s.teamKey!)))
  )
    return insufficient();
  const observations = matches.flatMap((m) => [
    { teams: m.red, score: m.redScore, opponentScore: m.blueScore },
    { teams: m.blue, score: m.blueScore, opponentScore: m.redScore }
  ]);
  const teamKeys = resolveTeamKeys(ctx, s, () =>
    [...new Set(matches.flatMap((m) => [...m.red, ...m.blue]))].sort(
      (a, b) => a - b
    )
  );
  const rows = (fn: (t: number) => any) =>
    ok(teamKeys.map((teamKey) => ({ teamKey, value: fn(teamKey) })));
  const tm = (t: number) =>
    matches.filter((m) => [...m.red, ...m.blue].includes(t));
  const scores = (t: number) =>
    tm(t).map((m) => (m.red.includes(t) ? m.redScore : m.blueScore));
  const record = (t: number) => {
    const a = tm(t);
    return {
      wins: a.filter(
        (m) =>
          (m.red.includes(t)
            ? m.redScore - m.blueScore
            : m.blueScore - m.redScore) > 0
      ).length,
      losses: a.filter(
        (m) =>
          (m.red.includes(t)
            ? m.redScore - m.blueScore
            : m.blueScore - m.redScore) < 0
      ).length,
      ties: a.filter((m) => m.redScore === m.blueScore).length,
      played: a.length
    };
  };
  if ([1, 6, 7, 8, 9].includes(id)) {
    const fit =
      id === 9
        ? iterativeOpr(observations)
        : opr(
            observations,
            id === 6 ? 'opponentScore' : id === 7 ? 'margin' : 'score',
            id === 8 ? p.lambda : 0
          );
    return ok(
      {
        teams: teamKeys.map((teamKey) => ({
          teamKey,
          value: fit.ratings[teamKey] ?? null
        })),
        rank: fit.rank,
        columns: fit.columns
      },
      [
        ...(fit.underdetermined
          ? [
              'Rank-deficient schedule; minimum-norm estimates are not individually identifiable'
            ]
          : []),
        ...(id === 9
          ? [
              'A9 uses catalogue residual refinement of least squares, not a separately standardized iOPR'
            ]
          : [])
      ]
    );
  }
  const epa = () => ratings(matches),
    elo = () => ratings(matches, 'elo');
  switch (id) {
    case 10: {
      const r = epa();
      return rows((t) => r.ratings[t] ?? null);
    }
    case 12: {
      const r = epa(),
        values = Object.values(r.ratings),
        sd = std(values);
      return sd && sd > 0
        ? rows((t) =>
            r.ratings[t] === undefined
              ? null
              : (r.ratings[t] - mean(values)!) / sd
          )
        : insufficient('EPA variance is zero or fewer than two teams');
    }
    case 13: {
      const r = elo();
      return rows((t) => r.ratings[t] ?? null);
    }
    case 14: {
      const r = elo();
      return rows((t) =>
        r.ratings[t] === undefined
          ? null
          : { peak: r.peak[t], delta: r.ratings[t] - r.initial }
      );
    }
    case 15: {
      const r = bradleyTerry(matches);
      return rows((t) => r[t] ?? null);
    }
    case 16:
    case 18:
    case 19:
    case 42: {
      const targets = ctx.matches.filter(
        (m) => s.matchId === undefined || m.id === s.matchId
      );
      if (!targets.length) return insufficient('Target schedule is absent');
      const random = rng(p.seed ?? parseInt(ctx.queryHash.slice(0, 8), 16));
      return ok(
        targets.map((m): Json => {
          const before = matches.filter(
              (x) =>
                (x.key !== keyOf(m) &&
                  ctx.matches.find((y) => keyOf(y) === x.key)!.actualStartTime <
                    m.actualStartTime) ||
                (m.result === -1 && x.key !== keyOf(m))
            ),
            r = ratings(before),
            teams = (side: boolean) =>
              (m.participants ?? [])
                .filter((t) => t.station < 20 === side)
                .map((t) => t.teamKey),
            red = teams(true),
            blue = teams(false);
          if (
            !red.length ||
            !blue.length ||
            [...red, ...blue].some((t) => r.ratings[t] === undefined)
          )
            return {
              tournamentKey: m.tournamentKey,
              matchId: m.id,
              status: 'insufficient_data',
              reason: 'No prior observations for every scheduled team'
            };
          const pred = (teams: number[]) => sum(teams.map((t) => r.ratings[t])),
            margin = pred(red) - pred(blue);
          let value: any = id === 16 ? logistic(margin) : margin;
          if (id === 19) {
            const samples = Array.from({ length: p.samples }, () =>
              [red, blue].map((g) =>
                sum(
                  g.map((t) => {
                    const v = r.contributions[t];
                    return v[Math.floor(random() * v.length)];
                  })
                )
              )
            );
            value = {
              red: [0.1, 0.5, 0.9].map((q) =>
                quantile(
                  samples.map((v) => v[0]),
                  q
                )
              ),
              blue: [0.1, 0.5, 0.9].map((q) =>
                quantile(
                  samples.map((v) => v[1]),
                  q
                )
              ),
              samples: p.samples,
              seed: p.seed ?? parseInt(ctx.queryHash.slice(0, 8), 16)
            };
          }
          if (id === 42) {
            if (
              !p.partnerTeamKey ||
              !p.replacementTeamKey ||
              r.ratings[p.replacementTeamKey] === undefined
            )
              return {
                tournamentKey: m.tournamentKey,
                matchId: m.id,
                status: 'unavailable',
                reason:
                  'Known partnerTeamKey and trained replacementTeamKey are required'
              };
            const chosen = p.alliance === 'red' ? red : blue;
            if (
              !chosen.includes(p.partnerTeamKey) ||
              chosen.includes(p.replacementTeamKey)
            )
              return {
                tournamentKey: m.tournamentKey,
                matchId: m.id,
                status: 'unavailable',
                reason:
                  'Replacement must swap a current partner for a different team'
              };
            value =
              r.ratings[p.replacementTeamKey] - r.ratings[p.partnerTeamKey];
          }
          return { tournamentKey: m.tournamentKey, matchId: m.id, value };
        }),
        [
          'Predictions are chronological, event-local estimates; no cross-event prior'
        ]
      );
    }
    case 20: {
      const r = epa();
      const usable = matches.filter(
        (m, i) =>
          i > 0 &&
          [...m.red, ...m.blue].every((t) =>
            matches
              .slice(0, i)
              .some((prior) => [...prior.red, ...prior.blue].includes(t))
          )
      );
      return ok(
        mean(
          usable.map(
            (m) =>
              (r.predictions[m.key].probability -
                (m.redScore === m.blueScore
                  ? 0.5
                  : m.redScore > m.blueScore
                    ? 1
                    : 0)) **
              2
          )
        )
      );
    }
    case 21: {
      const r = epa();
      return ok(
        matches
          .filter(
            (m, i) =>
              (s.matchId === undefined ||
                ctx.matches.find((x) => keyOf(x) === m.key)?.id ===
                  s.matchId) &&
              m.redScore !== m.blueScore &&
              i > 0 &&
              [...m.red, ...m.blue].every((t) =>
                matches
                  .slice(0, i)
                  .some((prior) => [...prior.red, ...prior.blue].includes(t))
              )
          )
          .map((m) => ({
            matchKey: m.key,
            value:
              m.redScore > m.blueScore
                ? 1 - r.predictions[m.key].probability
                : r.predictions[m.key].probability
          }))
      );
    }
    case 22: {
      const r = epa();
      return rows((t) => std(r.contributions[t] ?? []));
    }
    case 23: {
      const r = epa();
      return rows((t) =>
        r.contributions[t]?.length
          ? {
              floor: Math.min(...r.contributions[t]),
              ceiling: Math.max(...r.contributions[t])
            }
          : null
      );
    }
    case 24:
    case 25: {
      const fit = opr(observations);
      return rows((t) => {
        const values = ctx.matches
          .filter((m) => m.participants?.some((p) => p.teamKey === t))
          .flatMap((m) => {
            const member = m.participants!.find((p) => p.teamKey === t)!;
            return m
              .participants!.filter(
                (p) =>
                  p.teamKey !== t &&
                  (p.station < 20 === member.station < 20) === (id === 24)
              )
              .map((p) => fit.ratings[p.teamKey]);
          });
        return values.length && values.every((v) => v !== undefined)
          ? mean(values)
          : null;
      });
    }
    case 27:
      return rows((t) => (tm(t).length ? record(t) : null));
    case 28:
      return rows((t) =>
        record(t).played ? record(t).wins / record(t).played : null
      );
    case 34:
      return rows((t) => ({
        average: mean(scores(t)),
        median: median(scores(t))
      }));
    case 35: {
      const avg = mean(matches.flatMap((m) => [m.redScore, m.blueScore]))!;
      return rows((t) => (scores(t).length ? mean(scores(t))! - avg : null));
    }
    case 36:
      return rows((t) => ({
        played: tm(t).length,
        surrogate: ctx.matches
          .filter((m) => m.result !== -1)
          .flatMap((m) => m.participants ?? [])
          .filter((p) => p.teamKey === t && p.surrogate > 0).length
      }));
    case 37:
      return rows(
        (t) =>
          new Set(
            tm(t).flatMap((m) =>
              (m.red.includes(t) ? m.red : m.blue).filter((k) => k !== t)
            )
          ).size
      );
    case 38:
      if (!p.opponentTeamKey) return unavailable('opponentTeamKey is required');
      return rows((t) => {
        const a = tm(t).filter((m) =>
          (m.red.includes(t) ? m.blue : m.red).includes(p.opponentTeamKey!)
        );
        return a.length
          ? {
              wins: a.filter(
                (m) =>
                  (m.red.includes(t)
                    ? m.redScore - m.blueScore
                    : m.blueScore - m.redScore) > 0
              ).length,
              losses: a.filter(
                (m) =>
                  (m.red.includes(t)
                    ? m.redScore - m.blueScore
                    : m.blueScore - m.redScore) < 0
              ).length,
              ties: a.filter((m) => m.redScore === m.blueScore).length
            }
          : null;
      });
    case 39: {
      const fit = opr(observations),
        metric = (t: number) =>
          p.metric === 'opr'
            ? fit.ratings[t]
            : p.metric === 'score'
              ? mean(scores(t))!
              : record(t).wins / record(t).played,
        ordered = [...Object.keys(fit.ratings).map(Number)].sort(
          (a, b) => metric(b) - metric(a) || a - b
        );
      return rows((t) =>
        ordered.includes(t)
          ? 1 -
            (ordered.findIndex((k) => metric(k) === metric(t)) + 1) /
              ordered.length
          : null
      );
    }
    case 40:
      return rows((t) =>
        scores(t).length >= 2 * p.window
          ? mean(scores(t).slice(-p.window))! -
            mean(scores(t).slice(0, p.window))!
          : null
      );
    case 41:
      return rows((t) => slope(scores(t)));
    default:
      throw new Error('Unimplemented portable calculator A' + id);
  }
}
