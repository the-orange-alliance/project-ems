import { apiFetcher } from '@toa-lib/client';
import { ScheduleItem, EventSchedule } from '@toa-lib/models';
import useSWR from 'swr';

export const postSchedule = async (items: ScheduleItem[]): Promise<void> =>
  apiFetcher('schedule', 'POST', items);

export const patchSchedule = async (item: ScheduleItem): Promise<void> =>
  apiFetcher(`${item.eventKey}/schedule/${item.id}`, 'PATCH', item);

export const deleteSchedule = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  apiFetcher(`schedule/${eventKey}/${tournamentKey}`, 'DELETE');

export const useScheduleForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<EventSchedule>(
    eventKey && tournamentKey
      ? `storage/${eventKey}_${tournamentKey}.json`
      : undefined,
    (url) => apiFetcher(url, 'GET')
  );

export const useScheduleItemsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<ScheduleItem[]>(
    eventKey && tournamentKey
      ? `schedule/${eventKey}/${tournamentKey}`
      : undefined,
    (url) => apiFetcher(url, 'GET'),
    { revalidateOnFocus: false }
  );
