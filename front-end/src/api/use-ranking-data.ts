import { clientFetcher } from '@toa-lib/client';
import { Team, Ranking, isRankingArray } from '@toa-lib/models';

export const createRankings = (
  tournamentKey: string,
  teams: Team[]
): Promise<void> =>
  clientFetcher(`ranking/create/${tournamentKey}`, 'POST', teams);

export const postRankings = (
  eventKey: string,
  rankings: Ranking[]
): Promise<void> => clientFetcher(`ranking/${eventKey}`, 'POST', rankings);

export const recalculateRankings = (
  eventKey: string,
  tournamentKey: string
): Promise<Ranking[]> =>
  clientFetcher(
    `ranking/calculate/${eventKey}/${tournamentKey}`,
    'POST',
    isRankingArray
  );

export const recalculatePlayoffsRankings = (
  eventKey: string,
  tournamentKey: string
): Promise<Ranking[]> =>
  clientFetcher(
    `ranking/calculate/${eventKey}/${tournamentKey}?playoffs=true`,
    'POST',
    isRankingArray
  );
