import { apiFetcher, clientFetcher } from '@toa-lib/client';
import { ApiResponseError, Event, eventZod } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const setupEventBase = async (eventKey: string): Promise<void> =>
  clientFetcher(`event/setup/${eventKey}`, 'GET');

export const setupDefaultAccounts = async (): Promise<void> =>
  clientFetcher('auth/setup', 'GET');

export const purgeAll = async (): Promise<void> =>
  clientFetcher('admin/purge', 'DELETE');

export const postEvent = async (event: Event): Promise<void> =>
  clientFetcher('event', 'POST', event);

export const patchEvent = async (
  eventKey: string,
  event: Event
): Promise<void> => clientFetcher(`event/${eventKey}`, 'PATCH', event);

export const useEvent = (): SWRResponse<Event, ApiResponseError> =>
  useSWR<Event>(
    'event',
    (url) => apiFetcher(url, 'GET', undefined, eventZod.parse),
    { revalidateOnFocus: false }
  );
