import { isNonNullObject, isNumber, isString } from './types';

export class ApiErrorResponse extends Error {
  constructor(
    public response: Response,
    err: ApiError,
    url: string = response.url
  ) {
    super(err.message);
    this.name = `Invalid API Response from ${url} with code ${err.code}.`;
    Error.captureStackTrace(this, ApiErrorResponse);
  }
}

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
