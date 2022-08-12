import { clientFetcher } from '@toa-lib/client';
import {
  ApiErrorResponse,
  User,
  isUser,
  isUserLoginResponse,
  isUserArray,
  UserLoginResponse
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

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

export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiErrorResponse> =>
  useSWR<User>(
    'auth/login',
    (url) => clientFetcher(url, 'POST', { username, password }, isUser),
    { revalidateOnFocus: false }
  );

export const useUsers = (): SWRResponse<User[], ApiErrorResponse> =>
  useSWR<User[]>(
    'auth/users',
    (url) => clientFetcher(url, 'GET', undefined, isUserArray),
    { revalidateOnFocus: false }
  );
