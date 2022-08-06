export type TypeGuard<T> = (t: unknown) => t is T;

export const isNonNullObject = (obj: unknown): obj is Record<string, unknown> =>
  typeof obj === 'object' && obj !== null;

export const isString = (str: unknown): boolean => typeof str === 'string';

export const isNumber = (num: unknown): boolean =>
  typeof num === 'number' && !isNaN(num);

export const isBoolean = (bool: unknown): boolean => typeof bool === 'boolean';
