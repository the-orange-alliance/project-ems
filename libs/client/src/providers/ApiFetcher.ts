import {
  DEFAULT_API_PORT,
  DEFAULT_API_HOST,
  ApiResponseError,
  TypeGuard,
  isApiError
} from '@toa-lib/models';
import { ZodTypeDef, ZodType } from 'zod';

export const options = {
  host: DEFAULT_API_HOST
};

/**
 * @deprecated
 * @param url
 * @param method
 * @param body
 * @param guard
 * @returns
 */
export const clientFetcher = async <T>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
  guard?: TypeGuard<T>
): Promise<T> => {
  // NOTE - If options.host doesn't include http://, fetch() will put the host request URL onto it.
  const request = await fetch(`${options.host}/${url}`, {
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
      throw new ApiResponseError(request, {
        code: data.code,
        message: data.message
      });
    } else {
      throw new ApiResponseError(request, {
        code: request.status,
        message: request.statusText
      });
    }
  }

  if (guard && !guard(data)) {
    throw new ApiResponseError(request, {
      code: 0,
      message: 'TypeGuard assertion failed.'
    });
  }

  return data;
};

/**
 * Utility function that fetchers from the given URL and parses into the zod definition (if given).
 * @param url url as a string
 * @param method method 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
 * @param body POST/PATCH/PUT body
 * @param guard zod parse
 * @returns
 */
export const apiFetcher = async <T, Z extends ZodTypeDef = ZodTypeDef>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
  guard?: ZodType<T, Z>['parse']
): Promise<T> => {
  // NOTE - If options.host doesn't include http://, fetch() will put the host request URL onto it.
  const request = await fetch(`${options.host}/${url}`, {
    credentials: 'include',
    method,
    body: JSON.stringify(body),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {})
    }
  });

  const data = await request.json();

  if (!request.ok) {
    if (isApiError(data)) {
      throw new ApiResponseError(request, {
        code: data.code,
        message: data.message
      });
    } else {
      throw new ApiResponseError(request, {
        code: request.status,
        message: request.statusText
      });
    }
  }

  if (guard) {
    try {
      const typedData = guard(data);
      return typedData;
    } catch (e) {
      console.error(e);
      throw new ApiResponseError(request, {
        code: 0,
        message: 'TypeGuard assertion failed.'
      });
    }
  } else {
    return data;
  }
};
