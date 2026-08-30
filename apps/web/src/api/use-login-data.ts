import {
  ApiResponseError,
  User,
  UserLoginResponse,
  userLoginResponseZod,
  userZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const loginApi = {
  create: {
    login: async (
      username: string,
      password: string
    ): Promise<UserLoginResponse> => {
      const payload = await localClient.post<unknown>('/auth/login', {
        body: { username, password }
      });
      return userLoginResponseZod.parse(payload);
    }
  },
  get: {
    logout: async (): Promise<void> => {
      await localClient.get<void>('/auth/logout');
    },
    users: async (): Promise<User[]> => {
      const payload = await localClient.get<unknown[]>('/auth/users');
      return userZod.array().parse(payload ?? []);
    }
  }
};

export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiResponseError> =>
  useSWR<User>(
    '/auth/login',
    async () => {
      const payload = await localClient.post<unknown>('/auth/login', {
        body: { username, password }
      });
      return userZod.parse(payload);
    },
    { revalidateOnFocus: false }
  );

export const useUsers = (): SWRResponse<User[], ApiResponseError> =>
  useSWR<User[]>('/auth/users', () => loginApi.get.users(), {
    revalidateOnFocus: false
  });
