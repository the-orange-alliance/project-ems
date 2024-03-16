import { clientFetcher } from '@toa-lib/client';

export const resultsSyncMatches = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  clientFetcher(`results/sync/matches/${eventKey}/${tournamentKey}`, 'POST');

export const resultsSyncMatch = (
  eventKey: string,
  tournamentKey: string,
  id: number
): Promise<void> =>
  clientFetcher(
    `results/sync/matches/${eventKey}/${tournamentKey}/${id}`,
    'POST'
  );

export const resultsSyncRankings = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  clientFetcher(`results/sync/rankings/${eventKey}/${tournamentKey}`, 'POST');
