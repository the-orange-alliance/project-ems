export type LoadSource =
  | 'catalogue'
  | 'timelines'
  | 'teams'
  | 'matches'
  | 'query'
  | 'adaptation'
  | 'preview';

export class LoadError extends Error {
  constructor(
    public source: LoadSource,
    public kind: 'validation' | 'adaptation' | 'renderer',
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'LoadError';
  }
}

export interface LoadFailure {
  kind: 'network' | 'http' | 'validation' | 'adaptation' | 'renderer';
  message: string;
  status?: number;
  cause: unknown;
}

export type LoadState<T> =
  | {
      status: 'loading';
      source: LoadSource;
      requestedIdentity?: string;
      previous?: T;
    }
  | { status: 'ready'; source: LoadSource; data: T; requestedIdentity?: string }
  | {
      status: 'unavailable';
      source: LoadSource;
      reason: string;
      code:
        | 'not_found'
        | 'insufficient_data'
        | 'unavailable'
        | 'service_unavailable';
      requestedIdentity?: string;
    }
  | {
      status: 'error';
      source: LoadSource;
      error: LoadFailure;
      requestedIdentity?: string;
    };

export function failedLoad(
  source: LoadSource,
  cause: unknown
): LoadState<never> {
  const value = cause as {
    status?: number;
    message?: string;
    name?: string;
  } | null;
  if (cause instanceof LoadError) ({ source } = cause);
  const message =
    value?.message || 'Request failed. Check the connection and retry.';
  if (value?.status === 503)
    return {
      status: 'unavailable',
      source,
      code: 'service_unavailable',
      reason: message
    };
  return {
    status: 'error',
    source,
    error: {
      kind:
        cause instanceof LoadError
          ? cause.kind
          : value?.name === 'SyntaxError' || value?.name === 'ZodError'
            ? 'validation'
            : value?.status
              ? 'http'
              : 'network',
      message,
      status: value?.status,
      cause
    }
  };
}

export function requestLoadState<T>(
  source: LoadSource,
  request: { data?: T; error?: unknown; isValidating?: boolean }
): LoadState<T> {
  if (request.error && request.isValidating)
    return { status: 'loading', source };
  if (request.error) return failedLoad(source, request.error);
  if (request.data === undefined) return { status: 'loading', source };
  return { status: 'ready', source, data: request.data };
}

/** A missing/invalid collection response is a decode failure; [] is valid empty data. */
export function requireCollection<T>(
  payload: T[] | null,
  source: LoadSource
): T[] {
  if (!Array.isArray(payload))
    throw new LoadError(
      source,
      'validation',
      `Invalid ${source} response: expected a list.`
    );
  return payload;
}
