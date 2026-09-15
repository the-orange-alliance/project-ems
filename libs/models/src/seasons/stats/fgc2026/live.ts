import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient
} from '../types.js';
import {
  game,
  identity,
  officialRankings,
  eligibleScores,
  fields,
  memberStates,
  rankingAverage
} from './helpers.js';
import {
  matchActions,
  cleanActions,
  delta,
  clockAt,
  replayAt
} from '../util/action-event-replay.js';
import { sum, mean, logistic } from '../util/statistics.js';
import {
  calculateScore,
  FGC26MatchDetailsZod,
  IgnitingInnovationSeason
} from '../../FGC26_IgnitingInnovation.js';
export function live(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  if (!ctx.matches.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1;
  if (id === 12) {
    const provisional = ctx.matches.map((m) => {
      const r = replayAt(ctx, m, ctx.calculatedAsOfUtc);
      return r ? { ...r.match, result: 0 } : m;
    });
    const rankings = IgnitingInnovationSeason.functions!.calculateRankings(
      provisional as any,
      []
    );
    return ok(rankings as any, [
      'Provisional rankings use the existing season ranking implementation'
    ]);
  }
  return ok(
    ctx.matches.map((m) => {
      const replay = replayAt(
          ctx,
          m,
          ctx.calculatedAsOfUtc,
          [1, 2].includes(id)
        ),
        current = replay?.match ?? m,
        g = game(current);
      if (!g) return { ...identity(m), value: null };
      const actions = cleanActions(matchActions(ctx, m), {
          physicalOnly: true
        }),
        own = actions.filter(
          (a) =>
            a.fieldPath ===
            `details.wildfireIn${side === 0 ? 'Red' : 'Blue'}SuppressionUnit`
        ),
        now = Date.parse(ctx.calculatedAsOfUtc),
        clock = clockAt(ctx, m, ctx.calculatedAsOfUtc),
        from = new Date(now - p.windowSeconds * 1000).toISOString(),
        previous = replayAt(ctx, m, from, true),
        velocity = previous
          ? (() => {
              const details = { ...g.d };
              for (const field of [
                'wildfireInRedSuppressionUnit',
                'wildfireInBlueSuppressionUnit',
                'wildfireInExtinguisher'
              ] as const)
                details[field] = Number(previous.match.details![field]);
              return (
                (g.score[side] -
                  calculateScore({ ...current, details })[side]) /
                p.windowSeconds
              );
            })()
          : null;
      const expectedGain = (index: number) => {
        const participants = (m.participants ?? []).filter(
          (t) => t.station < 20 === (index === 0)
        );
        const expected = participants.map((t) =>
          mean(
            memberStates(ctx, t.teamKey)
              .filter((r) => r.m.actualStartTime < m.actualStartTime)
              .map((r) => r.brace)
          )
        );
        return participants.length === 3 && expected.every((v) => v !== null)
          ? g.supp[index] *
              Math.max(0, 1 + sum(expected as number[]) - g.mult[index])
          : null;
      };
      let value: any;
      switch (id) {
        case 1:
          value = velocity;
          break;
        case 2: {
          const gain = expectedGain(side);
          value =
            velocity !== null && clock && gain !== null
              ? {
                  projected:
                    g.score[side] +
                    velocity * Number(clock.timeLeft) +
                    (Number(clock.timeLeft) > 0 ? gain : 0),
                  expectedEndgame: Number(clock.timeLeft) > 0 ? gain : 0
                }
              : null;
          break;
        }
        case 3: {
          const red = expectedGain(0),
            blue = expectedGain(1);
          value =
            clock &&
            (Number(clock.timeLeft) === 0 || (red !== null && blue !== null))
              ? Number(clock.timeLeft) === 0
                ? g.score[0] === g.score[1]
                  ? 0.5
                  : g.score[0] > g.score[1]
                    ? 1
                    : 0
                : logistic(
                    g.score[0] - g.score[1] + red! - blue!,
                    Math.max(1, 50 * Math.sqrt(Number(clock.timeLeft) / 150))
                  )
              : null;
          break;
        }
        case 4:
          value = own.length
            ? (now - Date.parse(own.at(-1)!.occurredAtUtc)) / 1000
            : null;
          break;
        case 5: {
          let run = 0,
            alliance: string | null = null;
          for (const a of actions.filter(
            (a) =>
              (delta(a) ?? 0) > 0 && (a.fieldPath ?? '').includes('Suppression')
          )) {
            const next = a.fieldPath!.includes('Red') ? 'red' : 'blue';
            if (next === alliance) run++;
            else {
              alliance = next;
              run = 1;
            }
          }
          value = alliance ? { alliance, entries: run } : null;
          break;
        }
        case 6:
          value = m.actualStartTime
            ? Array.from({ length: 5 }, (_, i) => ({
                fromSeconds: i * 30,
                toSeconds: (i + 1) * 30,
                balls: sum(
                  own
                    .filter((a) => {
                      const t =
                        (Date.parse(a.occurredAtUtc) -
                          Date.parse(m.actualStartTime)) /
                        1000;
                      return t >= i * 30 && t < (i + 1) * 30;
                    })
                    .map((a) => delta(a) ?? 0)
                )
              }))
            : null;
          break;
        case 7: {
          // Only uncontained balls can be added; neither other unit is emptied.
          // Ceiling rounding can make the lead predicate nonmonotonic, so inspect
          // every legal candidate in ascending order using the official scorer.
          const capacity = 500 - g.total;
          value = null;
          if (!Number.isSafeInteger(capacity) || capacity < 0) break;
          const field =
            side === 0
              ? 'wildfireInRedSuppressionUnit'
              : 'wildfireInBlueSuppressionUnit';
          for (let balls = 0; balls <= capacity; balls++) {
            const details = { ...g.d, [field]: g.d[field] + balls };
            const scores = calculateScore({ ...current, details });
            if (scores[side] > scores[1 - side]) {
              value = balls;
              break;
            }
          }
          break;
        }
        case 8: {
          const played = ctx.matches.filter((m) => m.result !== -1);
          value = played.length
            ? Math.max(
                0,
                Math.ceil(
                  (Math.max(
                    ...played.flatMap((m) => [m.redScore, m.blueScore])
                  ) +
                    1 -
                    g.score[side]) /
                    g.mult[side]
                )
              )
            : null;
          break;
        }
        case 9:
          value = Math.max(0, 4 - g.z3);
          break;
        case 10:
          value = g.z3 === 3 ? 10 : g.z3 === 4 || g.z3 === 5 ? 15 : 0;
          break;
        case 11: {
          value = (m.participants ?? [])
            .filter((t) => s.teamKey === undefined || t.teamKey === s.teamKey)
            .map((t) => {
              const scores = eligibleScores(ctx, t.teamKey)
                .filter(
                  (r) =>
                    r.m.tournamentKey !== m.tournamentKey || r.m.id !== m.id
                )
                .map((r) => r.score);
              const prior = rankingAverage(scores),
                index = t.station < 20 ? 0 : 1;
              if (
                prior === null ||
                t.surrogate ||
                t.disqualified ||
                t.cardStatus >= 2
              )
                return { teamKey: t.teamKey, balls: null };
              const improves = (balls: number) => {
                const details = { ...g.d };
                const field =
                  index === 0
                    ? 'wildfireInRedSuppressionUnit'
                    : 'wildfireInBlueSuppressionUnit';
                details[field] += balls;
                return (
                  rankingAverage([
                    ...scores,
                    calculateScore({ ...current, details })[index]
                  ])! > prior
                );
              };
              let high = 1;
              while (!improves(high) && high < 1048576) high *= 2;
              if (!improves(high)) return { teamKey: t.teamKey, balls: null };
              let low = 0;
              while (low < high) {
                const middle = Math.floor((low + high) / 2);
                if (improves(middle)) high = middle;
                else low = middle + 1;
              }
              return { teamKey: t.teamKey, balls: low };
            });
          break;
        }
        case 13:
          value = g.supp[side] * 0.3;
          break;
        case 14: {
          const anchor = matchActions(ctx, m).find(
            (a) => a.sourceEvent === 'timer:endgame'
          );
          const atUtc =
            anchor?.occurredAtUtc ??
            (m.actualStartTime && Number.isFinite(Date.parse(m.actualStartTime))
              ? new Date(Date.parse(m.actualStartTime) + 120000).toISOString()
              : null);
          const frozen =
            atUtc && atUtc <= ctx.calculatedAsOfUtc
              ? replayAt(ctx, m, atUtc)
              : null;
          const atEndgame = frozen ? game(frozen.match) : null;
          if (!atEndgame || !frozen) {
            value = null;
            break;
          }
          const scores = [0, 0.3].map((brace) => {
            const details = { ...atEndgame.d };
            for (const f of fields) (details as any)[f + 'BraceState'] = brace;
            return calculateScore({ ...frozen.match, details })[side];
          });
          value = {
            worst: scores[0],
            best: scores[1],
            suppressionFrozen: atEndgame.supp[side]
          };
          break;
        }
        default:
          throw new Error('Unimplemented H' + id);
      }
      return { ...identity(m), value };
    }),
    [
      'Live values are a best-effort replay at calculatedAsOfUtc; cached values do not advance the clock',
      ...(id === 7
        ? [
            'Minimum additional own suppression balls for a strict official-score lead; other counts, braces, partner climbs and penalties are frozen. Both scores include recalculated foul awards and ceiling rounding. Search is limited to the 500-ball field load; 0 means already leading, null means impossible within capacity or incomplete/invalid data. Cards do not alter alliance scores.'
          ]
        : [])
    ]
  );
}
