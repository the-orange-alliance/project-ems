import { clientFetcher } from '@toa-lib/client';
import { ScheduleItem } from '@toa-lib/models';

export const postSchedule = async (items: ScheduleItem[]): Promise<void> =>
  clientFetcher('schedule', 'POST', items);

export const patchSchedule = async (item: ScheduleItem): Promise<void> =>
  clientFetcher(`${item.eventKey}/schedule/${item.id}`, 'PATCH', item);

export const deleteSchedule = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  clientFetcher(`schedule/${eventKey}/${tournamentKey}`, 'DELETE');
