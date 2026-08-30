import { isNonNullObject, isNumber, isString } from '../types.js';

// V8-only API (Node/Chrome). Declared unconditionally by @types/node (where it's
// visible) but absent from the plain lib.dom/lib.es types this package is also
// compiled against (e.g. the web app's tsconfig restricts ambient `types` to
// react/react-dom). Cast through `unknown` rather than `extends
// ErrorConstructor` so this works regardless of which is in scope.
type ErrorConstructorWithCapture = {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
};

export class ApiResponseError extends Error {
  constructor(
    public response: Response,
    err: ApiError,
    url: string = response.url
  ) {
    super(err.message);
    this.name = `Invalid API Response from ${url} with code ${err.code}.`;
    // V8-only API (Node/Chrome), not part of the standard ErrorConstructor type.
    const captureStackTrace = (Error as unknown as ErrorConstructorWithCapture)
      .captureStackTrace;
    if (captureStackTrace) {
      captureStackTrace(this, ApiResponseError);
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
    const captureStackTrace = (Error as unknown as ErrorConstructorWithCapture)
      .captureStackTrace;
    if (captureStackTrace) {
      captureStackTrace(this, ApiDatabaseError);
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
