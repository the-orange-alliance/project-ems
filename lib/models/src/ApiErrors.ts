import { isNonNullObject, isNumber, isString } from './types.js';

export class ApiResponseError extends Error {
  constructor(
    public response: Response,
    err: ApiError,
    url: string = response.url
  ) {
    super(err.message);
    this.name = `Invalid API Response from ${url} with code ${err.code}.`;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiResponseError);
    }
  }
}

export class ApiDatabaseError extends Error {
  constructor(table: string, err: unknown) {
    super();
    if (err instanceof Error) {
      this.message = err.message;
      this.name = `Error while executing query (${err.name}) in table ${table}.`;
    } else {
      this.name = `Error while executing query in table ${table}.`;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiDatabaseError);
    }
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
