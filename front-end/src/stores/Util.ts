export function replaceInArray<T>(
  items: T[],
  key: keyof T,
  value: string | number,
  newValue: T
): T[] | undefined {
  const index = items?.findIndex((i) => i[key] === value);
  if (index < 0) return undefined;
  return [...items.slice(0, index), newValue, ...items.slice(index + 1)];
}

export function replaceAllInArray<T>(
  items: T[],
  key: keyof T,
  condition: string | number,
  newItems: T[]
): T[] {
  const keyItems = items.filter((i) => i[key] === condition);
  return [...keyItems, ...newItems];
}

export function removeFromArray<T>(
  items: T[],
  key: keyof T,
  value: string | number
): T[] {
  return [...items.filter((i) => i[key] !== value)];
}
