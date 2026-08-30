import { ApiResponseError } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const storageApi = {
  create: {
    file: (file: string, data: unknown): Promise<void | null> =>
      localClient.post<void>('/storage', { body: { file, data } })
  },
  update: {
    key: (file: string, key: string, data: unknown): Promise<void | null> =>
      localClient.patch<void>('/storage', { body: { file, key, data } })
  },
  get: {
    file: <T>(file: string): Promise<T | null> =>
      localClient.get<T>(`/storage/${file}`)
  }
};

export const useApiStorage = <T>(
  file: string
): SWRResponse<T, ApiResponseError> =>
  useSWR<T>(
    `/storage/${file}`,
    async () => {
      const data = await storageApi.get.file<T>(file);
      if (data === null) {
        throw new Error(`Storage payload missing for ${file}`);
      }
      return data;
    },
    {
      revalidateOnFocus: false
    }
  );
