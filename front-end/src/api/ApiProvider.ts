import { clientFetcher } from '@toa-lib/client';
import {
  ApiResponseError,
  User,
  isUser,
  isUserLoginResponse,
  isUserArray,
  UserLoginResponse,
  Event,
  isEvent
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

/** Simple requests for POST, PUT, DELETE */
export const login = async (
  username: string,
  password: string
): Promise<UserLoginResponse> =>
  clientFetcher(
    'auth/login',
    'POST',
    {
      username,
      password
    },
    isUserLoginResponse
  );

export const logout = async (): Promise<void> =>
  clientFetcher('auth/logout', 'GET');

export const setupEventBase = async (): Promise<void> =>
  clientFetcher('event/setup', 'GET');

export const setupDefaultAccounts = async (): Promise<void> =>
  clientFetcher('auth/setup', 'GET');

export const purgeAll = async (): Promise<void> =>
  clientFetcher('admin/purge', 'DELETE');

/** React hooks to use GET requests for data. */
export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiResponseError> =>
  useSWR<User>(
    'auth/login',
    (url) => clientFetcher(url, 'POST', { username, password }, isUser),
    { revalidateOnFocus: false }
  );

export const useUsers = (): SWRResponse<User[], ApiResponseError> =>
  useSWR<User[]>(
    'auth/users',
    (url) => clientFetcher(url, 'GET', undefined, isUserArray),
    { revalidateOnFocus: false }
  );

export const useEvent = (): SWRResponse<Event, ApiResponseError> =>
  useSWR<Event>(
    'event',
    (url) => clientFetcher(url, 'GET', undefined, isEvent),
    { revalidateOnFocus: false }
  );
