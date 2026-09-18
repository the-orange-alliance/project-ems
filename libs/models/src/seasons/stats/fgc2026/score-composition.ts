import {
  type CalculatorContext,
  type StatParams,
  ok,
  insufficient
} from '../types.js';
import { gameMatches, identity } from './helpers.js';
import { mean, histogram } from '../util/statistics.js';
export function scoreComposition(
  id: number,
  ctx: CalculatorContext,
  p: StatParams
) {
  if (id === 14)
    return ok({
      points: 1065,
      penaltiesExcluded: true,
      feasibility:
        'Schema upper bound; simultaneous six Z3 and partner flags may not be physically attainable'
    });
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1,
    scores = games.flatMap((r) => r.g.score),
    margins = games.map((r) => Math.abs(r.m.redScore - r.m.blueScore));
  switch (id) {
    case 7:
      return ok({ highest: Math.max(...scores), lowest: Math.min(...scores) });
    case 8:
      return ok(histogram(scores, p.bins));
    case 9:
      return ok(histogram(margins, p.bins));
    case 10:
      return ok(games.filter((r) => r.m.result === 0).length);
    case 11: {
      const sorted = [...games].sort(
        (a, b) =>
          Math.abs(a.m.redScore - a.m.blueScore) -
          Math.abs(b.m.redScore - b.m.blueScore)
      );
      return ok({
        closest: { ...identity(sorted[0].m), margin: Math.min(...margins) },
        widest: { ...identity(sorted.at(-1)!.m), margin: Math.max(...margins) }
      });
    }
    case 12:
      return ok(
        games.map((r, i) => ({
          ...identity(r.m),
          index: i + 1,
          meanScore: mean(r.g.score)
        }))
      );
    case 13: {
      let record = -Infinity;
      return ok(
        games.flatMap(({ m, g }) => {
          const score = Math.max(...g.score);
          if (score <= record) return [];
          record = score;
          return [{ ...identity(m), score, atUtc: m.actualStartTime }];
        })
      );
    }
  }
  return ok(
    games.map(({ m, g }) => {
      const slices = {
        suppression: g.supp[side] * g.mult[side],
        partner: g.partner[side],
        extinguisher: g.exting,
        coopertition: g.coop,
        fouls: g.foul[side]
      };
      let value: any;
      switch (id) {
        case 1:
          value = slices;
          break;
        case 2:
          value = g.score[side]
            ? Object.fromEntries(
                Object.entries(slices).map(([k, v]) => [k, v / g.score[side]])
              )
            : null;
          break;
        case 3:
          value = g.supp[side] + g.partner[side] + g.exting + g.coop;
          break;
        case 4:
          value = g.supp[side] * (g.mult[side] - 1);
          break;
        case 5: {
          const scores = g.supp.map(
            (v, i) => v + g.partner[i] + g.exting + g.coop
          );
          value = {
            red: scores[0],
            blue: scores[1],
            resultChanged:
              Math.sign(scores[0] - scores[1]) !==
              Math.sign(m.redScore - m.blueScore),
            penaltiesExcluded: true
          };
          break;
        }
        case 6:
          value = {
            red: g.score[0] - g.coop,
            blue: g.score[1] - g.coop,
            resultChanged: false
          };
          break;
        case 15:
          value = g.score[side] / 1065;
          break;
        case 16:
          value = g.total ? g.score[side] / g.total : null;
          break;
        case 17:
          value = Math.ceil(g.raw[side]) - g.raw[side];
          break;
        default:
          throw new Error('Unimplemented F' + id);
      }
      return { ...identity(m), value };
    })
  );
}
