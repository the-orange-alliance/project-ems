import { clientFetcher } from '@toa-lib/client';
import { ApiResponseError } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const setApiStorageKey = async (
  file: string,
  key: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'PATCH', { file, key, data });

export const setApiStorage = async (
  file: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'POST', { file, data });

export const useApiStorage = <T>(
  file: string
): SWRResponse<T, ApiResponseError> =>
  useSWR<T>(`storage/${file}`, (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });
