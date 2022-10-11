export function replaceInArray<T>(
  items: T[],
  key: keyof T,
  value: string,
  newValue: T
): T[] | undefined {
  const index = items?.findIndex((i) => i[key] === value);
  if (index < 0) return undefined;
  return [...items.slice(0, index), newValue, ...items.slice(index + 1)];
}
