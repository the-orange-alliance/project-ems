import { mergeWith, isArray } from 'lodash';

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
  const keyItems = items.filter((i) => i[key] !== condition);
  return [...keyItems, ...newItems];
}

export function removeFromArray<T>(
  items: T[],
  key: keyof T,
  value: string | number
): T[] {
  return [...items.filter((i) => i[key] !== value)];
}

export function getDifferences<T>(
  items: T[],
  prevItems: T[],
  key: keyof T
): { additions: T[]; deletions: T[]; edits: T[] } {
  const additions = items.filter(
    (i) => !prevItems.find((j) => i[key] === j[key])
  );
  const deletions = prevItems.filter(
    (i) => !items.find((j) => i[key] === j[key])
  );
  const edits = items.filter(
    (i) => !prevItems.includes(i) && !additions.includes(i)
  );
  return { additions, deletions, edits };
}

export function deepMerge<T>(target: T, source: T): T {
  return mergeWith({}, target, source, (objValue, srcValue) => {
    if (isArray(objValue) && isArray(srcValue)) {
      return srcValue;
    }
  });
}

export function mergeWithTarget<T>(
  source: T[] | undefined,
  target: T[],
  key: keyof T
): T[] {
  const sourceMap = new Map((source || []).map((item) => [item[key], item]));
  const targetMap = new Map(target.map((item) => [item[key], item]));

  const mergedIds = new Set([...sourceMap.keys(), ...targetMap.keys()]);
  const mergedArray: T[] = [];

  for (const id of mergedIds) {
    const sourceItem = sourceMap.get(id);
    const targetItem = targetMap.get(id);

    if (sourceItem && targetItem) {
      mergedArray.push(deepMerge(sourceItem, targetItem));
    } else {
      mergedArray.push(targetItem ?? sourceItem!);
    }
  }

  return mergedArray;
}
