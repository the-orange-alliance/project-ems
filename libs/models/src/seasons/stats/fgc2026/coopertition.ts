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
  braceTransitions
} from '../util/action-event-replay.js';
import { sum, mean, ratio } from '../util/statistics.js';
export function coopertition(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1;
  const keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey));
  if ([3, 4, 5].includes(id))
    return ok(
      games.filter((r) =>
        id === 3 ? r.g.coop > 0 : id === 4 ? r.g.coop === 40 : r.g.z3 === 3
      ).length / games.length
    );
  if (id === 13) return ok(sum(games.map((r) => r.g.exting + r.g.coop)));
  if ([9, 10, 11].includes(id))
    return ok(
      keys.map((teamKey) => {
        const a = memberStates(ctx, teamKey);
        return {
          teamKey,
          value:
            id === 9
              ? mean(a.map((r) => r.g.exting + r.g.coop))
              : a.map((r) => ({
                  ...identity(r.m),
                  value:
                    id === 10
                      ? r.brace === 0.3 && [4, 5, 6].includes(r.g.z3)
                      : r.g.z3 === 3 && r.brace < 0.3
                }))
        };
      }),
      id === 10
        ? [
            'Contribution is counterfactual removal of this final Z3, not a claim about arrival order'
          ]
        : []
    );
  return ok(
    games.map(({ m, g }) => {
      let value: any;
      switch (id) {
        case 1:
          value = g.coop;
          break;
        case 2:
          value = g.z3;
          break;
        case 6:
          value = g.exting + g.coop;
          break;
        case 7:
          value = ratio(g.exting + g.coop, g.score[side]);
          break;
        case 8:
          value = g.score[side] - g.exting - g.coop;
          break;
        case 12: {
          const crossing = braceTransitions(ctx, m).find(
            (r) => r.before === 3 && r.after === 4
          );
          value = crossing ? crossing.index < 3 !== (side === 0) : null;
          break;
        }
        default:
          throw new Error('Unimplemented E' + id);
      }
      return { ...identity(m), value };
    })
  );
}
