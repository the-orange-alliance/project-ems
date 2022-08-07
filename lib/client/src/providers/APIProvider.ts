import {
  DEFAULT_API_PORT,
  DEFAULT_API_HOST,
  ApiErrorResponse,
  TypeGuard
} from '@toa-lib/models';

export const options = {
  host: DEFAULT_API_HOST,
  port: DEFAULT_API_PORT
};

export const clientFetcher = async <T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
  guard?: TypeGuard<T>
): Promise<T> => {
  const request = await fetch(`${options.host}:${options.port}/${url}`, {
    credentials: 'include',
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await request.json();

  if (!guard || !guard(data)) {
    throw new ApiErrorResponse(request);
  }

  return data;
};
