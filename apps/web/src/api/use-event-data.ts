import { ApiResponseError, Event, eventZod } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { eventKeyAtom } from 'src/stores/state/index.js';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const eventsApi = {
  setup: {
    get: {
      eventBase: async (eventKey: string): Promise<void> => {
        await localClient.get<void>(`/event/setup/${eventKey}`);
      },
      defaultAccounts: async (): Promise<void> => {
        await localClient.get<void>('/auth/setup');
      }
    },
    delete: {
      purgeAll: async (): Promise<void> => {
        await localClient.delete<void>('/admin/purge');
      }
    }
  },
  get: {
    events: () =>
      localClient.get<Event[]>('/event', {
        schema: eventZod.array()
      }),
    event: (eventKey: string): Promise<Event | null> =>
      localClient.get<Event>(`/event/${eventKey}`, { schema: eventZod })
  },
  create: {
    event: (event: Event) => localClient.post<void>('/event', { body: event })
  },
  update: {
    event: async (eventKey: string, event: Event): Promise<void> => {
      await localClient.patch<void>(`/event/${eventKey}`, { body: event });
    }
  },
  delete: {
    event: async (eventKey: string): Promise<void> => {
      await localClient.delete<void>(`/event/${eventKey}`);
    }
  }
};

export const useEvents = (
  config?: SWRConfiguration,
  fetch: boolean = true
): SWRResponse<Event[] | null> =>
  useSWR<Event[] | null>(
    fetch ? '/event' : null,
    () => eventsApi.get.events(),
    config
  );

export const useEvent = (
  eventKey: string | null | undefined,
  config?: SWRConfiguration
): SWRResponse<Event | null, ApiResponseError> =>
  useSWR<Event | null, ApiResponseError, readonly [string, string] | null>(
    eventKey ? (['/event', eventKey] as const) : null,
    ([, key]) => eventsApi.get.event(key),
    config
  );

export const useCurrentEvent = (
  config?: SWRConfiguration
): SWRResponse<Event | null, ApiResponseError> =>
  useEvent(useAtomValue(eventKeyAtom), config);
