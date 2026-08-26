import { apiFetcher } from '@toa-lib/client';
import useSWR, { SWRResponse } from 'swr';

export interface Heartbeat {
  online: boolean;
  serverTimeUtc: string;
  version: string;
}

export const getHeartbeat = async (): Promise<Heartbeat> =>
  apiFetcher('heartbeat', 'GET');

export const useHeartbeat = (
  refreshInterval?: number
): SWRResponse<Heartbeat> =>
  useSWR<Heartbeat>('heartbeat', () => getHeartbeat(), {
    refreshInterval,
    revalidateOnFocus: false
  });
