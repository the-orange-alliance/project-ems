import {
  DEFAULT_API_PORT,
  DEFAULT_API_HOST,
  ApiErrorResponse,
  TypeGuard,
  isApiError
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

  if (!request.ok) {
    if (isApiError(data)) {
      throw new ApiErrorResponse(request, {
        code: data.code,
        message: data.message
      });
    } else {
      throw new ApiErrorResponse(request, {
        code: request.status,
        message: request.statusText
      });
    }
  }

  if (!guard || !guard(data)) {
    throw new ApiErrorResponse(request, {
      code: 0,
      message: 'TypeGuard assertion failed.'
    });
  }

  return data;
};
