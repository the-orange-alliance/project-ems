export interface ApiError {
  code: number;
  message: string;
}

export interface SQLError {
  length: number;
  name: string;
  severity: string;
  code: string;
  position: string;
  file: string;
  line: string;
  routine: string;
}

export const isNonNullObject = (obj: unknown): obj is Record<string, unknown> =>
  typeof obj === 'object' && obj !== null;

export const isString = (str: unknown): boolean => typeof str === 'string';

export const isNumber = (num: unknown): boolean =>
  typeof num === 'number' && !isNaN(num);

export const isBoolean = (bool: unknown): boolean => typeof bool === 'boolean';

export const isApiError = (err: unknown): err is ApiError =>
  isNonNullObject(err) && isNumber(err.code) && isString(err.message);

export const isSQLError = (err: unknown): err is SQLError =>
  isNonNullObject(err) &&
  isNumber(err.length) &&
  isString(err.name) &&
  isString(err.severity) &&
  isString(err.code) &&
  isString(err.position) &&
  isString(err.file) &&
  isString(err.line) &&
  isString(err.routine);
