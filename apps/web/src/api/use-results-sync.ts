import { SyncPlatform } from '@toa-lib/models';
import { localClient } from './http-clients.js';

const buildType = import.meta.env.VITE_BUILD_TYPE;

interface SyncResponse {
  success: boolean;
}

const shouldBlockSync = (): boolean => buildType === 'production';

const blockedSyncResponse = (): Promise<SyncResponse> =>
  Promise.resolve({ success: false });

export const resultsSyncApi = {
  create: {
    matches: (
      eventKey: string,
      tournamentKey: string,
      platform: SyncPlatform,
      apiKey: string
    ): Promise<SyncResponse> => {
      if (shouldBlockSync()) return blockedSyncResponse();
      return localClient.post<SyncResponse>(
        `/results/sync/matches/${eventKey}/${tournamentKey}`,
        {
          body: { platform, apiKey }
        }
      ) as Promise<SyncResponse>;
    },
    match: (
      eventKey: string,
      tournamentKey: string,
      id: number,
      platform: SyncPlatform,
      apiKey: string
    ): Promise<SyncResponse> => {
      if (shouldBlockSync()) return blockedSyncResponse();
      return localClient.post<SyncResponse>(
        `/results/sync/matches/${eventKey}/${tournamentKey}/${id}`,
        {
          body: { platform, apiKey }
        }
      ) as Promise<SyncResponse>;
    },
    rankings: (
      eventKey: string,
      tournamentKey: string,
      platform: SyncPlatform,
      apiKey: string
    ): Promise<SyncResponse> => {
      if (shouldBlockSync()) return blockedSyncResponse();
      return localClient.post<SyncResponse>(
        `/results/sync/rankings/${eventKey}/${tournamentKey}`,
        {
          body: { platform, apiKey }
        }
      ) as Promise<SyncResponse>;
    },
    alliances: (
      eventKey: string,
      tournamentKey: string,
      platform: SyncPlatform,
      apiKey: string
    ): Promise<SyncResponse> => {
      if (shouldBlockSync()) return blockedSyncResponse();
      return localClient.post<SyncResponse>(
        `/results/sync/alliances/${eventKey}/${tournamentKey}`,
        {
          body: { platform, apiKey }
        }
      ) as Promise<SyncResponse>;
    },
    teams: (
      eventKey: string,
      platform: SyncPlatform,
      apiKey: string
    ): Promise<SyncResponse> => {
      if (shouldBlockSync()) return blockedSyncResponse();
      return localClient.post<SyncResponse>(`/results/sync/teams/${eventKey}`, {
        body: { platform, apiKey }
      }) as Promise<SyncResponse>;
    }
  }
};
