import {
  type CalculatorContext,
  type StatParams,
  ok,
  insufficient
} from '../types.js';
import { played, gameMatches, identity } from './helpers.js';
import { endAt, matchActions } from '../util/action-event-replay.js';
import { mean, sum } from '../util/statistics.js';
export function tournamentOperations(
  id: number,
  ctx: CalculatorContext,
  p: StatParams
) {
  if (!ctx.matches.length) return insufficient();
  const all = played(ctx),
    difference = (a: string | undefined, b: string | undefined) =>
      a && b && Number.isFinite(Date.parse(a) - Date.parse(b))
        ? (Date.parse(a) - Date.parse(b)) / 1000
        : null;
  if (id === 7)
    return ok({
      played: all.length,
      remaining: ctx.matches.length - all.length
    });
  if (!all.length) return insufficient();
  if (id === 2)
    return ok(
      mean(
        all
          .slice(-p.window)
          .map((m) => m.cycleTime)
          .filter((v) => v > 0)
      )
    );
  if (id === 8)
    return ok(
      Object.entries(Object.groupBy(all, (m) => m.fieldNumber)).map(
        ([field, m]) => ({
          fieldNumber: Number(field),
          meanScore: mean(m!.flatMap((m) => [m.redScore, m.blueScore])),
          matches: m!.length
        })
      )
    );
  if (id === 10) {
    const start = all[0].actualStartTime,
      end = endAt(ctx, all.at(-1)!),
      elapsed = difference(end ?? undefined, start);
    return elapsed && elapsed > 0
      ? ok(sum(gameMatches(ctx).map((r) => r.g.total)) / (elapsed / 3600))
      : insufficient('Event elapsed time is unavailable');
  }
  let drift = 0;
  return ok(
    all.map((m) => {
      let value: number | null = null;
      switch (id) {
        case 1:
          value = m.cycleTime > 0 ? m.cycleTime : null;
          break;
        case 3:
          value = difference(m.actualStartTime, m.scheduledTime);
          break;
        case 4: {
          const d = difference(m.actualStartTime, m.scheduledTime);
          if (d !== null) {
            drift += d;
            value = drift;
          }
          break;
        }
        case 5:
          value = difference(m.actualStartTime, m.prestartTime);
          break;
        case 6: {
          const next = all.find(
              (n) =>
                n.fieldNumber === m.fieldNumber &&
                n.actualStartTime > m.actualStartTime
            ),
            end = endAt(ctx, m);
          value = next ? difference(next.prestartTime, end ?? undefined) : null;
          break;
        }
        case 9: {
          const commit = matchActions(ctx, m).find(
            (a) => a.sourceEvent === 'match:commit'
          );
          value = difference(
            commit?.occurredAtUtc ?? m.updatedAtUtc,
            endAt(ctx, m) ?? undefined
          );
          break;
        }
        default:
          throw new Error('Unimplemented I' + id);
      }
      return { ...identity(m), value };
    }),
    id === 9
      ? [
          'Without a commit lifecycle anchor, updatedAtUtc may reflect later edits'
        ]
      : []
  );
}
