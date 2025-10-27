import { clientFetcher } from '@toa-lib/client';
import { SyncPlatform } from '@toa-lib/models';

const buildType = import.meta.env.VITE_BUILD_TYPE;

interface SyncResponse {
  success: boolean;
}

export const resultsSyncMatches = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> => {
  if (buildType === 'production') {
    return Promise.resolve({ success: false });
  }
  return clientFetcher<SyncResponse>(
    `results/sync/matches/${eventKey}/${tournamentKey}`,
    'POST',
    {
      platform,
      apiKey
    }
  );
};

export const resultsSyncMatch = (
  eventKey: string,
  tournamentKey: string,
  id: number,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> => {
  if (buildType === 'production') {
    return Promise.resolve({ success: false });
  }
  return clientFetcher<SyncResponse>(
    `results/sync/matches/${eventKey}/${tournamentKey}/${id}`,
    'POST',
    {
      platform,
      apiKey
    }
  );
};

export const resultsSyncRankings = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> => {
  if (buildType === 'production') {
    return Promise.resolve({ success: false });
  }
  return clientFetcher<SyncResponse>(
    `results/sync/rankings/${eventKey}/${tournamentKey}`,
    'POST',
    {
      platform,
      apiKey
    }
  );
};

export const resultsSyncAlliances = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> => {
  if (buildType === 'production') {
    return Promise.resolve({ success: false });
  }
  return clientFetcher<SyncResponse>(
    `results/sync/alliances/${eventKey}/${tournamentKey}`,
    'POST',
    {
      platform,
      apiKey
    }
  );
};

export const resultsSyncTeams = (
  eventKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> => {
  if (buildType === 'production') {
    return Promise.resolve({ success: false });
  }
  return clientFetcher<SyncResponse>(`results/sync/teams/${eventKey}`, 'POST', {
    platform,
    apiKey
  });
};
