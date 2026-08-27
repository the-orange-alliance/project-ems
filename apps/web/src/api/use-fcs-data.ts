import { apiFetcher } from '@toa-lib/client';
import { FGC25FCS } from '@toa-lib/models';
import useSWR from 'swr';

export const useFcsData = <T = FGC25FCS.SettingsType>(field: string | number) =>
  useSWR(
    field ? `fcs/settings/${field}` : undefined,
    (url) => apiFetcher<T>(url, 'GET'),
    { revalidateOnFocus: false }
  );

export const updateFcsData = async (field: number, data: any): Promise<void> =>
  apiFetcher(`fcs/settings/${field}`, 'PUT', data);
