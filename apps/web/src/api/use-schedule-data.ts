import { apiFetcher } from '@toa-lib/client';
import { ScheduleItem, ScheduleParams } from '@toa-lib/models';
import useSWR from 'swr';

export const getScheduleItems = async (
  eventKey: string,
  tournamentKey: string
): Promise<ScheduleItem[]> =>
  apiFetcher(`schedule-items/${eventKey}/${tournamentKey}`, 'GET');

export const postScheduleItems = async (items: ScheduleItem[]): Promise<void> =>
  apiFetcher('schedule-items', 'POST', items);

export const patchScheduleItems = async (item: ScheduleItem): Promise<void> =>
  apiFetcher(`${item.eventKey}/schedule-items/${item.id}`, 'PATCH', item);

export const deleteScheduleItems = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  apiFetcher(`schedule-items/${eventKey}/${tournamentKey}`, 'DELETE');

export const useScheduleItemsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<ScheduleItem[]>(
    eventKey && tournamentKey
      ? `schedule-items/${eventKey}/${tournamentKey}`
      : undefined,
    (url) => apiFetcher(url, 'GET'),
    { revalidateOnFocus: false }
  );

export const getScheduleParams = async (
  eventKey: string,
  tournamentKey: string
): Promise<ScheduleParams> =>
  apiFetcher(`schedule-params/${eventKey}/${tournamentKey}`, 'GET');

export const useScheduleParamsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<ScheduleParams>(
    eventKey && tournamentKey
      ? `schedule-params/${eventKey}/${tournamentKey}`
      : undefined,
    (url: string) => apiFetcher<ScheduleParams>(url, 'GET')
  );

export const patchScheduleParams = async (
  params: ScheduleParams
): Promise<void> =>
  apiFetcher(
    `schedule-params/${params.eventKey}/${params.tournamentKey}`,
    'PATCH',
    params
  );
