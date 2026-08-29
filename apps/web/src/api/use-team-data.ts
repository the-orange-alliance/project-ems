import { ApiResponseError, Team, teamZod } from '@toa-lib/models';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const teamsApi = {
  get: {
    teams: async (
      eventKey: string | null | undefined,
      averageScore?: boolean
    ): Promise<Team[]> => {
      if (!eventKey) return [];
      const payload = await localClient.get<unknown[]>(
        `/teams/${eventKey}${averageScore ? '?averageScore=true' : ''}`
      );
      return teamZod.array().parse(payload ?? []);
    }
  },
  create: {
    teams: async (eventKey: string, teams: Team[]): Promise<void> => {
      await localClient.post<void>(`/teams/${eventKey}`, { body: teams });
    },
    carriedCards: async (
      eventKey: string,
      tournamentKey: string,
      cards: { teamKey: number; cardStatus: number }[]
    ): Promise<void> => {
      await localClient.post<void>(
        `/teams/carry-cards/${eventKey}/${tournamentKey}`,
        {
          body: cards
        }
      );
    }
  },
  update: {
    team: async (
      eventKey: string,
      teamKey: number,
      team: Team
    ): Promise<void> => {
      await localClient.patch<void>(`/teams/${eventKey}/${teamKey}`, {
        body: team
      });
    }
  },
  delete: {
    team: async (team: Team): Promise<void> => {
      await localClient.delete<void>(`/teams/${team.eventKey}/${team.teamKey}`);
    }
  }
};

// `useTeams` was removed alongside the `GET /teams` route it called: that route
// queried a `team` table on the global database, which does not exist, so it
// 500'd on every call. Teams are per-event — use `useTeamsForEvent`.

export const useTeamsForEvent = (
  eventKey: string | null | undefined,
  averageScore?: boolean,
  config?: SWRConfiguration
): SWRResponse<Team[], ApiResponseError> =>
  useSWR<Team[], ApiResponseError, readonly [string, string, boolean] | null>(
    eventKey ? (['/teams', eventKey, Boolean(averageScore)] as const) : null,
    ([, eKey, avg]) => teamsApi.get.teams(eKey, avg),
    config ?? { revalidateOnFocus: false }
  );
