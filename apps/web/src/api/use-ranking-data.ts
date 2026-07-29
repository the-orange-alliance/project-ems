import { apiFetcher } from '@toa-lib/client';
import { MatchKey, Team, Ranking, rankingZod } from '@toa-lib/models';
import useSWR from 'swr';
import { withRetry } from './with-retry.js';

export const createRankings = (
  tournamentKey: string,
  teams: Team[]
): Promise<void> =>
  apiFetcher(`ranking/create/${tournamentKey}`, 'POST', teams);

export const postRankings = (
  eventKey: string,
  rankings: Ranking[]
): Promise<void> => apiFetcher(`ranking/${eventKey}`, 'POST', rankings);

export const recalculateRankings = (
  eventKey: string,
  tournamentKey: string
): Promise<Ranking[]> =>
  apiFetcher(`ranking/calculate/${eventKey}/${tournamentKey}`, 'POST');

export const recalculatePlayoffsRankings = (
  eventKey: string,
  tournamentKey: string
): Promise<Ranking[]> =>
  apiFetcher(
    `ranking/calculate/${eventKey}/${tournamentKey}?playoffs=true`,
    'POST'
  );

export const deleteRankings = (eventKey: string, tournamentKey: string) =>
  apiFetcher(`ranking/${eventKey}/${tournamentKey}`, 'DELETE');

/**
 * Fetches the rankings for the teams participating in the given match.
 * Returns the current rankings from the API (post-match once scores have
 * been committed and rankings recalculated). Retries transient failures
 * before rethrowing the last error.
 */
export const fetchMatchRankings = ({
  eventKey,
  tournamentKey,
  id
}: MatchKey): Promise<Ranking[]> =>
  withRetry(() =>
    apiFetcher(
      `ranking/${eventKey}/${tournamentKey}/${id}`,
      'GET',
      undefined,
      rankingZod.array().parse
    )
  );

export const useRankingsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<Ranking[]>(
    eventKey && tournamentKey
      ? `ranking/${eventKey}/${tournamentKey}`
      : undefined,
    (url) => apiFetcher(url, 'GET')
  );
