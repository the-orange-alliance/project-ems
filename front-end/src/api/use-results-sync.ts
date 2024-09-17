import { clientFetcher } from '@toa-lib/client';
import { SyncPlatform } from '@toa-lib/models';

export const resultsSyncMatches = (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<void> =>
  clientFetcher(`results/sync/matches/${eventKey}/${tournamentKey}`, 'POST', {
    platform,
    apiKey
  });

export const resultsSyncMatch = (
  eventKey: string,
  tournamentKey: string,
  id: number,
  platform: SyncPlatform,
  apiKey: string
): Promise<void> =>
  clientFetcher(
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
): Promise<void> =>
  clientFetcher(`results/sync/rankings/${eventKey}/${tournamentKey}`, 'POST', {
    platform,
    apiKey
  });

export const resultsSyncTeams = (
  eventKey: string,
  platform: SyncPlatform,
  apiKey: string
): Promise<void> =>
  clientFetcher(`results/sync/teams/${eventKey}`, 'POST', {
    platform,
    apiKey
  });