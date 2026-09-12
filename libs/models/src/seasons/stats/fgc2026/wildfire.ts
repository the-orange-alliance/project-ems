import {
  type CalculatorContext,
  type StatParams,
  ok,
  insufficient,
  unavailable,
  keyOf
} from '../types.js';
import { gameMatches, identity } from './helpers.js';
import {
  matchActions,
  cleanActions,
  delta,
  parseValue,
  endAt
} from '../util/action-event-replay.js';
import { sum, mean, ratio } from '../util/statistics.js';
export function wildfire(id: number, ctx: CalculatorContext, p: StatParams) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  if (id === 21) return ok(sum(games.map((x) => x.g.total)));
  if (id === 22)
    return ok(sum(games.map((x) => x.g.total)) / (500 * games.length));
  const side = p.alliance === 'red' ? 0 : 1;
  return ok(
    games.map(({ m, g }) => {
      const events = cleanActions(matchActions(ctx, m), { physicalOnly: true }),
        own = events.filter(
          (a) =>
            a.fieldPath ===
            `details.wildfireIn${side === 0 ? 'Red' : 'Blue'}SuppressionUnit`
        ),
        start = Date.parse(m.actualStartTime),
        elapsed = (at: string) =>
          Number.isFinite(start) ? (Date.parse(at) - start) / 1000 : null;
      let value: any;
      switch (id) {
        case 1:
          value = g.supp[side];
          break;
        case 2:
          value = g.exting;
          break;
        case 3:
          value = g.total;
          break;
        case 4:
          value = g.total / 500;
          break;
        case 5:
          value = 500 - g.total;
          break;
        case 6:
          value = ratio(sum(g.supp), g.total);
          break;
        case 7:
          value = ratio(g.exting, g.total);
          break;
        case 8:
          value = g.supp[0] - g.supp[1];
          break;
        case 9:
          value = g.total / 150;
          break;
        case 10:
          value = g.supp[side] / 150;
          break;
        case 11:
          value = events.length
            ? Math.max(
                ...events.map((a) =>
                  sum(
                    events
                      .filter(
                        (b) =>
                          Date.parse(b.occurredAtUtc) <=
                            Date.parse(a.occurredAtUtc) &&
                          Date.parse(b.occurredAtUtc) >
                            Date.parse(a.occurredAtUtc) - p.windowSeconds * 1000
                      )
                      .map((b) => delta(b) ?? 0)
                  )
                )
              )
            : null;
          break;
        case 12:
          value = events.find((a) => (delta(a) ?? 0) > 0)
            ? elapsed(events.find((a) => (delta(a) ?? 0) > 0)!.occurredAtUtc)
            : null;
          break;
        case 13:
          value = [50, 100, 200, 300].map((milestone) => {
            const a = own.find(
              (a) => Number(parseValue(a.newValueJson)) >= milestone
            );
            return { milestone, seconds: a ? elapsed(a.occurredAtUtc) : null };
          });
          break;
        case 14: {
          const points = own.map((a) => ({
              seconds: elapsed(a.occurredAtUtc),
              count: parseValue(a.newValueJson) ?? null
            })),
            weight = sum(own.map((a) => Math.max(0, delta(a) ?? 0)));
          value = points.length
            ? {
                points,
                skew:
                  weight && Number.isFinite(start)
                    ? sum(
                        own.map(
                          (a) =>
                            Math.max(0, delta(a) ?? 0) *
                            elapsed(a.occurredAtUtc)!
                        )
                      ) /
                        weight /
                        150 -
                      0.5
                    : null
              }
            : null;
          break;
        }
        case 15:
          value =
            own.length >= 2
              ? Math.max(
                  ...own
                    .slice(1)
                    .map(
                      (a, i) =>
                        (Date.parse(a.occurredAtUtc) -
                          Date.parse(own[i].occurredAtUtc)) /
                        1000
                    )
                )
              : null;
          break;
        case 16: {
          const all = events.filter(
            (a) => a.fieldPath === 'details.wildfireInExtinguisher'
          );
          value = all.length
            ? Object.entries(
                Object.groupBy(all, (a) => a.actorId ?? a.clientId ?? 'unknown')
              ).map(([actor, rows]) => ({
                actor,
                entries: rows!.length,
                netEntered: sum(rows!.map((a) => delta(a) ?? 0))
              }))
            : null;
          break;
        }
        case 17:
        case 18: {
          const setting = ctx.settings.find(
              (r) => Number(r.fieldNumber) === m.fieldNumber
            ),
            ratioValue = setting?.wildfireBallsPerLed;
          if (typeof ratioValue !== 'number') value = null;
          else
            value =
              id === 18
                ? ratioValue * g.mult[side]
                : {
                    red:
                      g.d.approximateWildfireInRedSuppressionUnit * ratioValue -
                      g.supp[0],
                    blue:
                      g.d.approximateWildfireInBlueSuppressionUnit *
                        ratioValue -
                      g.supp[1],
                    extinguisher:
                      g.d.approximateWildfireInExtinguisher * ratioValue -
                      g.exting
                  };
          break;
        }
        case 19: {
          const a = matchActions(ctx, m).filter((a) =>
              /^details.wildfireIn(Red|Blue)SuppressionUnit$/.test(
                a.fieldPath ?? ''
              )
            ),
            steps = a.filter((a) => Math.abs(delta(a) ?? 0) === 1).length,
            typed = a.filter((a) => Math.abs(delta(a) ?? 0) > 1).length;
          value = a.length
            ? { steps, typed, stepShare: ratio(steps, steps + typed) }
            : null;
          break;
        }
        case 20: {
          const end = endAt(ctx, m),
            history = ctx.history
              .filter((a) => keyOf(a) === keyOf(m))
              .sort((a, b) => Number(a.revision) - Number(b.revision)),
            first = history.find((a) => end && a.occurredAtUtc >= end),
            last = history.at(-1),
            column = side === 0 ? 'redScore' : 'blueScore';
          value =
            first && last ? Number(last[column]) - Number(first[column]) : null;
          break;
        }
        default:
          throw new Error('Unimplemented B' + id);
      }
      return { ...identity(m), value };
    }),
    [
      ...((id >= 11 && id <= 16) || id === 19
        ? [
            'Referee timestamps and cleaned counts are best-effort, not sensor measurements'
          ]
        : []),
      ...([17, 18].includes(id)
        ? [
            'Missing historical per-field LED ratio is unavailable; current settings may not describe past matches'
          ]
        : [])
    ]
  );
}
