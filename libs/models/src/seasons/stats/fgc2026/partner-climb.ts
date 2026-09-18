import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient,
  resolveTeamKeys
} from '../types.js';
import { gameMatches, memberStates, identity } from './helpers.js';
import { sum, ratio } from '../util/statistics.js';
export function partnerClimb(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1;
  const keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey));
  const carrier = (t: number) => {
    const all = memberStates(ctx, t),
      known = all.filter(
        (r) =>
          r.g.braces.slice(r.side * 3, r.side * 3 + 3).filter((v) => v > 0)
            .length === 1 ||
          !r.g.partners.slice(r.side * 3, r.side * 3 + 3).some(Boolean)
      );
    return {
      rate: ratio(
        known.filter(
          (r) =>
            r.brace > 0 &&
            r.g.partners
              .slice(r.side * 3, r.side * 3 + 3)
              .some((v, i) => v && i !== r.i % 3)
        ).length,
        known.length
      ),
      identifiedMatches: known.length,
      ambiguousMatches: all.length - known.length
    };
  };
  if (id === 3)
    return ok(
      keys.map((teamKey) => {
        const a = memberStates(ctx, teamKey);
        return {
          teamKey,
          value: ratio(a.filter((r) => r.partner).length, a.length)
        };
      })
    );
  if (id === 4)
    return ok(
      keys.map((teamKey) => ({ teamKey, ...carrier(teamKey) })),
      ['Carrier inference excludes ambiguous multi-brace alliances']
    );
  if (id === 8) {
    const a = ctx.teams
      .map((t) => ({ teamKey: t.teamKey, ...carrier(t.teamKey) }))
      .filter((v) => v.rate !== null)
      .sort((a, b) => b.rate! - a.rate!);
    return a.length
      ? ok(a[0], ['Carrier ranking uses identifiable alliances only'])
      : insufficient('No identifiable carrier');
  }
  if (id === 9) return ok(sum(games.flatMap((r) => r.g.partner)));
  return ok(
    games.map(({ m, g }) => {
      const braces = g.braces.slice(side * 3, side * 3 + 3),
        flags = g.partners.slice(side * 3, side * 3 + 3);
      let value: any;
      switch (id) {
        case 1:
          value = flags.filter(Boolean).length;
          break;
        case 2:
          value = g.partner[side];
          break;
        case 5:
          value =
            flags.filter(Boolean).length === 2 &&
            braces.filter((v) => v > 0).length === 1;
          break;
        case 6:
          value =
            braces.filter((v) => v > 0).length === 1
              ? braces.some((v) => v === 0.3) && flags.some(Boolean)
              : null;
          break;
        case 7:
          value = ratio(g.partner[side], g.score[side]);
          break;
        default:
          throw new Error('Unimplemented D' + id);
      }
      return { ...identity(m), value };
    })
  );
}
