import { apiFetcher } from '@toa-lib/client';
import { Team, Ranking } from '@toa-lib/models';
import useSWR from 'swr';

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
