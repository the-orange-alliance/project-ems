import { clientFetcher } from '@toa-lib/client';
import { ApiErrorResponse, isUser, User } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const login = async (
  username: string,
  password: string
): Promise<User> =>
  clientFetcher(
    'auth/login',
    'POST',
    {
      username,
      password
    },
    isUser
  );

export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiErrorResponse> =>
  useSWR<User>(
    'auth/login',
    (url) => clientFetcher(url, 'POST', { username, password }, isUser),
    { revalidateOnFocus: false }
  );
