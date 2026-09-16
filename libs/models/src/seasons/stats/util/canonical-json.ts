export function assertJson(v: unknown, seen = new Set<object>()): void {
  if (
    v === null ||
    typeof v === 'string' ||
    typeof v === 'boolean' ||
    (typeof v === 'number' && Number.isFinite(v))
  )
    return;
  if (
    typeof v !== 'object' ||
    !v ||
    seen.has(v) ||
    (!Array.isArray(v) &&
      Object.getPrototypeOf(v) !== Object.prototype &&
      Object.getPrototypeOf(v) !== null)
  )
    throw new Error('Only finite acyclic plain JSON is supported');
  if (
    Object.getOwnPropertySymbols(v).length ||
    (Array.isArray(v) &&
      (Object.keys(v).length !== v.length ||
        Array.from({ length: v.length }, (_, i) => i).some(
          (i) => !Object.hasOwn(v, i)
        )))
  )
    throw new Error(
      'Symbol properties and sparse or extended arrays are not JSON values'
    );
  seen.add(v);
  for (const item of Object.values(v)) assertJson(item, seen);
  seen.delete(v);
}
export function canonicalJson(v: unknown): string {
  assertJson(v);
  const sort = (x: any): any =>
    Array.isArray(x)
      ? x.map(sort)
      : x !== null && typeof x === 'object'
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, sort(x[k])])
          )
        : x;
  return JSON.stringify(sort(v));
}
