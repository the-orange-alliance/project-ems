import { ApiResponseError } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export interface Heartbeat {
  online: boolean;
  serverTimeUtc: string;
  version: string;
}

export const heartbeatApi = {
  get: {
    heartbeat: async (): Promise<Heartbeat> => {
      const heartbeat = await localClient.get<Heartbeat>('/heartbeat');
      if (!heartbeat) throw new Error('Heartbeat response was empty');
      return heartbeat;
    }
  }
};
export const useHeartbeat = (
  refreshInterval?: number
): SWRResponse<Heartbeat, ApiResponseError> =>
  useSWR<Heartbeat, ApiResponseError>(
    '/heartbeat',
    () => heartbeatApi.get.heartbeat(),
    {
      refreshInterval,
      revalidateOnFocus: false
    }
  );
