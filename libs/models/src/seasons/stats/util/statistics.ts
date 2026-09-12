export const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : null);
export const variance = (a: number[]) =>
  a.length > 1 ? sum(a.map((n) => (n - mean(a)!) ** 2)) / (a.length - 1) : null;
export const std = (a: number[]) =>
  variance(a) === null ? null : Math.sqrt(variance(a)!);
export const quantile = (a: number[], p: number) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y),
    j = (s.length - 1) * p,
    i = Math.floor(j);
  return s[i] + (s[Math.ceil(j)] - s[i]) * (j - i);
};
export const median = (a: number[]) => quantile(a, 0.5);
export const ratio = (a: number, b: number) => (b === 0 ? null : a / b);
export const slope = (a: number[]) => {
  if (a.length < 2) return null;
  const x = (a.length - 1) / 2,
    y = mean(a)!;
  return (
    sum(a.map((v, i) => (i - x) * (v - y))) / sum(a.map((_, i) => (i - x) ** 2))
  );
};
export const pearson = (a: number[], b: number[]) => {
  if (a.length < 2 || a.length !== b.length) return null;
  const ma = mean(a)!,
    mb = mean(b)!,
    d = Math.sqrt(
      sum(a.map((v) => (v - ma) ** 2)) * sum(b.map((v) => (v - mb) ** 2))
    );
  return d ? sum(a.map((v, i) => (v - ma) * (b[i] - mb))) / d : null;
};
export const histogram = (a: number[], bins: number[]) => ({
  bins,
  counts: bins
    .slice(0, -1)
    .map(
      (lo, i) =>
        a.filter(
          (v) =>
            v >= lo &&
            (i === bins.length - 2 ? v <= bins[i + 1] : v < bins[i + 1])
        ).length
    ),
  below: a.filter((v) => v < bins[0]).length,
  above: a.filter((v) => v > bins[bins.length - 1]).length
});
export function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const logistic = (margin: number, scale = 50) =>
  1 / (1 + Math.exp(-Math.max(-700, Math.min(700, margin / scale))));
