import { apiFetcher } from '@toa-lib/client';
import { FGC25FCS } from '@toa-lib/models';
import useSWR from 'swr';

export const useFcsData = (field: string | number) =>
  useSWR(
    field ? `fcs/settings/${field}` : undefined,
    (url) => apiFetcher<FGC25FCS.SettingsType>(url, 'GET'),
    { revalidateOnFocus: false }
  );

export const updateFcsData = async (field: number, data: any): Promise<void> =>
  apiFetcher(`fcs/settings/${field}`, 'PUT', data);
