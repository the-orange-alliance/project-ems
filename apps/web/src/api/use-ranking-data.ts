import {
  ApiResponseError,
  MatchKey,
  Team,
  Ranking,
  rankingZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';
import { withRetry } from './with-retry.js';

export const rankingsApi = {
  create: {
    rankingsForTournament: async (
      tournamentKey: string,
      teams: Team[]
    ): Promise<void> => {
      await localClient.post<void>(`/ranking/create/${tournamentKey}`, {
        body: teams
      });
    },
    rankingsForEvent: async (
      eventKey: string,
      rankings: Ranking[]
    ): Promise<void> => {
      await localClient.post<void>(`/ranking/${eventKey}`, {
        body: rankings
      });
    },
    recalculate: async (
      eventKey: string,
      tournamentKey: string,
      playoffs: boolean = false
    ): Promise<Ranking[]> => {
      const payload = await localClient.post<unknown[]>(
        `/ranking/calculate/${eventKey}/${tournamentKey}${playoffs ? '?playoffs=true' : ''}`
      );
      return rankingZod.array().parse(payload ?? []);
    }
  },
  get: {
    matchRankings: async ({
      eventKey,
      tournamentKey,
      id
    }: MatchKey): Promise<Ranking[]> => {
      const payload = await localClient.get<unknown[]>(
        `/ranking/${eventKey}/${tournamentKey}/${id}`
      );
      return rankingZod.array().parse(payload ?? []);
    },
    tournamentRankings: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<Ranking[]> => {
      const payload = await localClient.get<unknown[]>(
        `/ranking/${eventKey}/${tournamentKey}`
      );
      return rankingZod.array().parse(payload ?? []);
    }
  },
  delete: {
    rankings: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<void> => {
      await localClient.delete<void>(`/ranking/${eventKey}/${tournamentKey}`);
    }
  }
};

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
    rankingsApi.get.matchRankings({ eventKey, tournamentKey, id })
  );

export const useRankingsForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<Ranking[], ApiResponseError> =>
  useSWR<Ranking[], ApiResponseError, readonly [string, string, string] | null>(
    eventKey && tournamentKey
      ? (['/ranking', eventKey, tournamentKey] as const)
      : null,
    ([, eKey, tKey]) => rankingsApi.get.tournamentRankings(eKey, tKey)
  );
