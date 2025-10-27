import { apiFetcher } from '@toa-lib/client';
import { ApiResponseError, Event, eventZod } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { eventKeyAtom } from 'src/stores/state/index.js';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

export const setupEventBase = async (eventKey: string): Promise<void> =>
  apiFetcher(`event/setup/${eventKey}`, 'GET');

export const setupDefaultAccounts = async (): Promise<void> =>
  apiFetcher('auth/setup', 'GET');

export const purgeAll = async (): Promise<void> =>
  apiFetcher('admin/purge', 'DELETE');

export const getEvents = async (): Promise<Event[]> =>
  apiFetcher('event', 'GET', undefined, eventZod.array().parse);

export const postEvent = async (event: Event): Promise<void> =>
  apiFetcher('event', 'POST', event);

export const patchEvent = async (
  eventKey: string,
  event: Event
): Promise<void> => apiFetcher(`event/${eventKey}`, 'PATCH', event);

export const useEvents = (
  config?: SWRConfiguration,
  fetch: boolean = true
): SWRResponse<Event[], ApiResponseError> =>
  useSWR<Event[]>(
    fetch ? 'event' : undefined,
    (url) => apiFetcher(url, 'GET', undefined, eventZod.array().parse),
    config
  );

export const useEvent = (
  eventKey: string | null | undefined,
  config?: SWRConfiguration
): SWRResponse<Event> =>
  useSWR<Event>(
    eventKey && eventKey.length > 0 ? `event/${eventKey}` : undefined,
    (url: string) => apiFetcher(url, 'GET', undefined, eventZod.parse),
    config
  );

export const useCurrentEvent = (
  config?: SWRConfiguration
): SWRResponse<Event> => useEvent(useAtomValue(eventKeyAtom), config);
