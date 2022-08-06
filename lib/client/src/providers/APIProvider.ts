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

export async function fetcher<T>(
  url: string,
  guard?: TypeGuard<T>
): Promise<T> {
  const request = await fetch(`${options.host}:${options.port}/${url}`, {
    credentials: 'include'
  });

  const data = await request.json();

  if (guard && !guard(data)) {
    throw new ApiErrorResponse(data);
  }

  return data;
}

export const post = async <T>(url: string, data: T): Promise<Response> =>
  fetch(`${options.host}:${options.port}/${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

export const del = async (url: string): Promise<Response> =>
  fetch(`${options.host}:${options.port}/${url}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });
