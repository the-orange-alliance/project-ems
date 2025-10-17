import { apiFetcher } from '@toa-lib/client';
import useSWR from 'swr';

export const useFcsData = (field: string) =>
  useSWR(
    field ? `fcs/settings/${field}` : undefined,
    (url) => apiFetcher(url, 'GET'),
    { revalidateOnFocus: false }
  );

export const updateFcsData = async (field: string, data: any): Promise<void> =>
  apiFetcher(`fcs/settings/${field}`, 'PUT', data);
