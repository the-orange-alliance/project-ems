import { ApiResponseError, FGC25FCS } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const fcsApi = {
  get: {
    settings: <T = FGC25FCS.SettingsType>(
      field: string | number
    ): Promise<T | null> => localClient.get<T>(`/fcs/settings/${field}`)
  },
  update: {
    settings: (field: number, data: unknown): Promise<void | null> =>
      localClient.put<void>(`/fcs/settings/${field}`, { body: data })
  }
};

export const useFcsData = <T = FGC25FCS.SettingsType>(
  field: string | number
): SWRResponse<T | null, ApiResponseError> =>
  useSWR<T | null, ApiResponseError>(
    field ? `/fcs/settings/${field}` : null,
    () => fcsApi.get.settings<T>(field),
    { revalidateOnFocus: false }
  );
