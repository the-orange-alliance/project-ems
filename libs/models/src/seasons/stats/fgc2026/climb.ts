import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient,
  resolveTeamKeys
} from '../types.js';
import { gameMatches, memberStates, identity, fields } from './helpers.js';
import {
  matchActions,
  parseValue,
  endAt
} from '../util/action-event-replay.js';
import { sum, mean } from '../util/statistics.js';
export function climb(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1,
    keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey));
  if ([4, 5, 6, 7, 8, 11, 13, 16, 19, 20].includes(id))
    return ok(
      keys.map((teamKey) => {
        const a = memberStates(ctx, teamKey);
        let value: any = null;
        if (a.length)
          switch (id) {
            case 4:
              value = a.filter((r) => r.brace === 0.3).length / a.length;
              break;
            case 5:
              value = [0, 0.05, 0.1, 0.2, 0.3].map((brace) => ({
                brace,
                count: a.filter((r) => r.brace === brace).length
              }));
              break;
            case 6:
              value = a.filter((r) => r.brace > 0).length / a.length;
              break;
            case 7:
              value = a.filter((r) => r.brace >= 0.1).length / a.length;
              break;
            case 8:
              value = Math.max(...a.map((r) => r.brace));
              break;
            case 11:
            case 13:
              value = a.map((r) => ({
                ...identity(r.m),
                value: r.g.supp[r.side] * (id === 11 ? r.brace : 0.3 - r.brace)
              }));
              break;
            case 16:
            case 19:
            case 20:
              value = a.map((r) => {
                const events = matchActions(ctx, r.m).filter(
                    (a) =>
                      a.fieldPath === 'details.' + fields[r.i] + 'BraceState'
                  ),
                  first = events.find(
                    (a) => Number(parseValue(a.newValueJson)) > 0
                  );
                return {
                  ...identity(r.m),
                  value:
                    id === 16
                      ? first && r.m.actualStartTime
                        ? (Date.parse(first.occurredAtUtc) -
                            Date.parse(r.m.actualStartTime)) /
                          1000
                        : null
                      : id === 20
                        ? events.length
                          ? events.length - 1
                          : null
                        : events.map((a) => ({
                            atUtc: a.occurredAtUtc,
                            from: parseValue(a.oldValueJson) ?? null,
                            to: parseValue(a.newValueJson) ?? null
                          }))
                };
              });
              break;
          }
        return { teamKey, value };
      }),
      id >= 16
        ? [
            'Brace entries record referee calls; revisions cannot identify falls or failed attempts'
          ]
        : []
    );
  if (id === 10) return ok(Math.max(...games.flatMap((x) => x.g.mult)));
  if (id === 12) {
    const all = ctx.teams.flatMap((t) =>
      memberStates(ctx, t.teamKey).map((r) => ({
        teamKey: t.teamKey,
        ...identity(r.m),
        value: r.g.supp[r.side] * r.brace
      }))
    );
    return all.length
      ? ok(all.sort((a, b) => b.value - a.value)[0])
      : insufficient();
  }
  if (id === 21) return ok(sum(games.map((x) => x.g.z3)));
  return ok(
    games.map(({ m, g }) => {
      let value: any;
      switch (id) {
        case 1:
          value = fields.map((station, i) => ({ station, brace: g.braces[i] }));
          break;
        case 2:
          value = g.mult[side];
          break;
        case 3:
          value = (g.mult[side] - 1) / 0.9;
          break;
        case 9:
          value = g.braces
            .slice(side * 3, side * 3 + 3)
            .every((v) => v === 0.3);
          break;
        case 14:
        case 15:
          value = g.supp[side] * (g.mult[side] - 1);
          break;
        case 17:
        case 18: {
          const a = matchActions(ctx, m).filter((a) =>
              (a.fieldPath ?? '').endsWith('BraceState')
            ),
            end = endAt(ctx, m);
          value =
            a.length && m.actualStartTime
              ? id === 17 && end
                ? (Date.parse(end) - Date.parse(a.at(-1)!.occurredAtUtc)) / 1000
                : (Date.parse(a[0].occurredAtUtc) -
                    Date.parse(m.actualStartTime)) /
                  1000
              : null;
          break;
        }
        case 22:
          value = g.z3;
          break;
        default:
          throw new Error('Unimplemented C' + id);
      }
      return { ...identity(m), value };
    }),
    id >= 16 && id <= 20
      ? ['Referee entry times, using lifecycle buzzer when present']
      : []
  );
}
