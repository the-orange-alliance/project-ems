import { apiFetcher, clientFetcher } from '@toa-lib/client';
import {
  ApiResponseError,
  User,
  UserLoginResponse,
  userLoginResponseZod,
  userZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const login = async (
  username: string,
  password: string
): Promise<UserLoginResponse> =>
  apiFetcher(
    'auth/login',
    'POST',
    {
      username,
      password
    },
    userLoginResponseZod.parse
  );

export const logout = async (): Promise<void> =>
  clientFetcher('auth/logout', 'GET');

export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiResponseError> =>
  useSWR<User>(
    'auth/login',
    (url) => apiFetcher(url, 'POST', { username, password }, userZod.parse),
    { revalidateOnFocus: false }
  );

export const useUsers = (): SWRResponse<User[], ApiResponseError> =>
  useSWR<User[]>(
    'auth/users',
    (url) => apiFetcher(url, 'GET', undefined, userZod.array().parse),
    { revalidateOnFocus: false }
  );
