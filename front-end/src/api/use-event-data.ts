import { apiFetcher } from '@toa-lib/client';
import { ApiResponseError, Event, eventZod } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';
import useSWR, { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

export const setupEventBase = async (eventKey: string): Promise<void> =>
  apiFetcher(`event/setup/${eventKey}`, 'GET');

export const setupDefaultAccounts = async (): Promise<void> =>
  apiFetcher('auth/setup', 'GET');

export const purgeAll = async (): Promise<void> =>
  apiFetcher('admin/purge', 'DELETE');

export const postEvent = async (event: Event): Promise<void> =>
  apiFetcher('event', 'POST', event);

export const patchEvent = async (
  eventKey: string,
  event: Event
): Promise<void> => apiFetcher(`event/${eventKey}`, 'PATCH', event);

export const useEvents = (): SWRResponse<Event[], ApiResponseError> =>
  useSWR<Event[]>('event', (url) =>
    apiFetcher(url, 'GET', undefined, eventZod.array().parse)
  );

export const useEvent = (eventKey?: string): SWRResponse<Event> =>
  useSWRImmutable<Event>(
    eventKey && eventKey.length > 0 ? `event/${eventKey}` : undefined,
    (url) => apiFetcher(url, 'GET', undefined, eventZod.parse)
  );

export const useCurrentEvent = (): SWRResponse<Event> =>
  useEvent(useRecoilValue(currentEventKeyAtom));
