import { sum } from '../util/statistics.js';
export interface RatingMatch {
  red: number[];
  blue: number[];
  redScore: number;
  blueScore: number;
  key: string;
}
export const MODEL_CONSTANTS = {
  version: 1,
  eloPrior: 1500,
  eloK: 32,
  eloScale: 400,
  epaPrior: 'first-match-alliance-mean-per-team',
  epaK: 0.3,
  btMu: 25,
  btSigma: 25 / 3,
  btBeta: 25 / 6,
  btKappa: 0.0001,
  btTau: 25 / 300,
  probabilityScale: 50,
  minimumMatches: 1,
  simulationSamples: 1000
};
export function ratings(matches: RatingMatch[], mode: 'elo' | 'epa' = 'epa') {
  const r: Record<number, number> = {},
    peak: Record<number, number> = {},
    contributions: Record<number, number[]> = {},
    predictions: Record<
      string,
      { red: number; blue: number; probability: number }
    > = {};
  const initial =
    mode === 'elo'
      ? 1500
      : matches.length
        ? (matches[0].redScore / matches[0].red.length +
            matches[0].blueScore / matches[0].blue.length) /
          2
        : 0;
  for (const m of matches) {
    for (const t of [...m.red, ...m.blue]) {
      r[t] ??= initial;
      peak[t] ??= initial;
      contributions[t] ??= [];
    }
    const red = sum(m.red.map((t) => r[t])),
      blue = sum(m.blue.map((t) => r[t]));
    const probability =
      mode === 'elo'
        ? 1 / (1 + 10 ** ((blue - red) / 400))
        : 1 / (1 + Math.exp(Math.max(-700, Math.min(700, (blue - red) / 50))));
    predictions[m.key] = { red, blue, probability };
    const outcome =
      m.redScore === m.blueScore ? 0.5 : m.redScore > m.blueScore ? 1 : 0;
    for (const [teams, score, predicted, sign] of [
      [m.red, m.redScore, red, 1],
      [m.blue, m.blueScore, blue, -1]
    ] as const) {
      const delta =
        mode === 'elo'
          ? 32 * sign * (outcome - probability)
          : (0.3 * (score - predicted)) / teams.length;
      for (const t of teams) {
        contributions[t].push(r[t] + (score - predicted) / teams.length);
        r[t] += delta;
        peak[t] = Math.max(peak[t], r[t]);
      }
    }
  }
  return { ratings: r, peak, contributions, predictions, initial };
}
/** Weng & Lin (2011), Algorithm 1, two-team Bradley-Terry full pairing. */
export function bradleyTerry(matches: RatingMatch[]) {
  const r: Record<number, { mu: number; sigma: number }> = {};
  for (const m of matches) {
    for (const t of [...m.red, ...m.blue]) {
      r[t] ??= { mu: 25, sigma: 25 / 3 };
      r[t].sigma = Math.hypot(r[t].sigma, 25 / 300);
    }
    const groups = [m.red, m.blue],
      mu = groups.map((g) => sum(g.map((t) => r[t].mu))),
      v = groups.map((g) => sum(g.map((t) => r[t].sigma ** 2)));
    const c = Math.sqrt(sum(v) + 2 * (25 / 6) ** 2),
      p = 1 / (1 + Math.exp((mu[1] - mu[0]) / c)),
      s = m.redScore === m.blueScore ? 0.5 : m.redScore > m.blueScore ? 1 : 0;
    groups.forEach((g, i) => {
      const omega = (v[i] / c) * (i === 0 ? s - p : p - s),
        delta = (((Math.sqrt(v[i]) / c) * v[i]) / (c * c)) * p * (1 - p);
      for (const t of g) {
        const share = r[t].sigma ** 2 / v[i];
        r[t] = {
          mu: r[t].mu + share * omega,
          sigma: r[t].sigma * Math.sqrt(Math.max(1 - share * delta, 0.0001))
        };
      }
    });
  }
  return r;
}
