import { clientFetcher } from '@toa-lib/client';
import {
  ApiResponseError,
  User,
  isUser,
  isUserLoginResponse,
  isUserArray,
  UserLoginResponse,
  Event,
  isEvent,
  Team
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

/** Requests to manipulate data */
export const setApiStorageKey = async (
  file: string,
  key: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'PATCH', { file, key, data });

export const setApiStorage = async (
  file: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'POST', { file, data });

export const postEvent = async (event: Event): Promise<void> =>
  clientFetcher('event', 'POST', event);

export const patchEvent = async (
  eventKey: string,
  event: Event
): Promise<void> => clientFetcher(`event/${eventKey}`, 'PATCH', event);

export const postTeams = async (teams: Team[]): Promise<void> =>
  clientFetcher('teams', 'POST', teams);

export const patchTeam = async (teamKey: string, team: Team): Promise<void> =>
  clientFetcher(`teams/${teamKey}`, 'PATCH', team);

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

export const useApiStorage = <T>(
  file: string
): SWRResponse<T, ApiResponseError> =>
  useSWR<T>(`storage/${file}`, (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });

export const useTeams = (): SWRResponse<Team[], ApiResponseError> =>
  useSWR('teams', (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });
