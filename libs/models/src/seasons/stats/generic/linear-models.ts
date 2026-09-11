import { leastSquares } from '../util/matrix-solve.js';
import { mean } from '../util/statistics.js';
export interface Observation {
  teams: number[];
  score: number;
  opponentScore: number;
}
export function opr(
  observations: Observation[],
  target: 'score' | 'opponentScore' | 'margin' = 'score',
  lambda = 0
) {
  const teams = [...new Set(observations.flatMap((r) => r.teams))].sort(
    (a, b) => a - b
  );
  const a = observations.map((r) =>
    teams.map((t) => (r.teams.includes(t) ? 1 : 0))
  );
  const b = observations.map((r) =>
    target === 'margin' ? r.score - r.opponentScore : r[target]
  );
  const prior = mean(observations.map((r) => r.score / r.teams.length)) ?? 0;
  const solved = leastSquares(a, b, lambda, lambda ? prior : 0);
  return {
    ...solved,
    ratings: Object.fromEntries(teams.map((t, i) => [t, solved.values[i]]))
  };
}
/** Catalogue A9 residual refinement; not claimed as a distinct standard iOPR. */
export function iterativeOpr(observations: Observation[]) {
  const base = opr(observations),
    teams = Object.keys(base.ratings).map(Number),
    a = observations.map((r) =>
      teams.map((t) => (r.teams.includes(t) ? 1 : 0))
    );
  let x = teams.map((t) => base.ratings[t]),
    iterations = 0;
  for (; iterations < 50; iterations++) {
    const residual = observations.map(
        (r) => r.score - r.teams.reduce((s, t) => s + x[teams.indexOf(t)], 0)
      ),
      correction = leastSquares(a, residual).values;
    x = x.map((v, i) => v + correction[i]);
    if (Math.max(...correction.map(Math.abs)) < 1e-8) break;
  }
  return {
    ...base,
    ratings: Object.fromEntries(teams.map((t, i) => [t, x[i]])),
    iterations: iterations + 1
  };
}
