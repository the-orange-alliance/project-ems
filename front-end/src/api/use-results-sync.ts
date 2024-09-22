import { clientFetcher } from '@toa-lib/client';
import { SyncPlatform } from '@toa-lib/models';

interface SyncResponse {
  success: boolean;
}

export const resultsSyncMatches = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> =>
  clientFetcher<SyncResponse>(
    `results/sync/matches/${eventKey}/${tournamentKey}`,
    'POST',
    {
      platform,
      apiKey
    }
  );

export const resultsSyncMatch = (
  eventKey: string,
  tournamentKey: string,
  id: number,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> =>
  clientFetcher<SyncResponse>(
    `results/sync/matches/${eventKey}/${tournamentKey}/${id}`,
    'POST',
    {
      platform,
      apiKey
    }
  );

export const resultsSyncRankings = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> =>
  clientFetcher<SyncResponse>(
    `results/sync/rankings/${eventKey}/${tournamentKey}`,
    'POST',
    {
      platform,
      apiKey
    }
  );

export const resultsSyncTeams = (
  eventKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<SyncResponse> =>
  clientFetcher<SyncResponse>(`results/sync/teams/${eventKey}`, 'POST', {
    platform,
    apiKey
  });
