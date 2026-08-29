import {
  ApiResponseError,
  ScheduleItem,
  ScheduleParams,
  scheduleItemZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const scheduleApi = {
  get: {
    items: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<ScheduleItem[]> => {
      const payload = await localClient.get<unknown[]>(
        `/schedule-items/${eventKey}/${tournamentKey}`
      );
      return scheduleItemZod.array().parse(payload ?? []);
    },
    params: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<ScheduleParams> => {
      const payload = await localClient.get<ScheduleParams>(
        `/schedule-params/${eventKey}/${tournamentKey}`
      );
      if (!payload) {
        throw new Error(
          `Schedule params not found: ${eventKey}/${tournamentKey}`
        );
      }
      return payload;
    }
  },
  create: {
    items: async (items: ScheduleItem[]): Promise<void> => {
      await localClient.post<void>('/schedule-items', { body: items });
    }
  },
  update: {
    item: async (item: ScheduleItem): Promise<void> => {
      await localClient.patch<void>(
        `/${item.eventKey}/schedule-items/${item.id}`,
        {
          body: item
        }
      );
    },
    params: async (params: ScheduleParams): Promise<void> => {
      await localClient.patch<void>(
        `/schedule-params/${params.eventKey}/${params.tournamentKey}`,
        {
          body: params
        }
      );
    }
  },
  delete: {
    items: async (eventKey: string, tournamentKey: string): Promise<void> => {
      await localClient.delete<void>(
        `/schedule-items/${eventKey}/${tournamentKey}`
      );
    }
  }
};

export const useScheduleItemsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<ScheduleItem[], ApiResponseError> =>
  useSWR<
    ScheduleItem[],
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey && tournamentKey
      ? (['/schedule-items', eventKey, tournamentKey] as const)
      : null,
    ([, eKey, tKey]) => scheduleApi.get.items(eKey, tKey),
    { revalidateOnFocus: false }
  );

export const useScheduleParamsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<ScheduleParams, ApiResponseError> =>
  useSWR<
    ScheduleParams,
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey && tournamentKey
      ? (['/schedule-params', eventKey, tournamentKey] as const)
      : null,
    ([, eKey, tKey]) => scheduleApi.get.params(eKey, tKey)
  );
