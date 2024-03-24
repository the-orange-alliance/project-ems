import { apiFetcher } from '@toa-lib/client';
import { ApiResponseError, Team } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const postTeams = async (
  eventKey: string,
  teams: Team[]
): Promise<void> => apiFetcher(`teams/${eventKey}`, 'POST', teams);

export const patchTeam = async (
  eventKey: string,
  teamKey: number,
  team: Team
): Promise<void> => apiFetcher(`teams/${eventKey}/${teamKey}`, 'PATCH', team);

export const deleteTeam = async (team: Team): Promise<void> =>
  apiFetcher(`teams/${team.eventKey}/${team.teamKey}`, `DELETE`, team);

export const useTeams = (): SWRResponse<Team[], ApiResponseError> =>
  useSWR('teams', (url) => apiFetcher(url, 'GET'));

export const useTeamsForEvent = (
  eventKey: string | null | undefined
): SWRResponse<Team[], ApiResponseError> =>
  useSWR(eventKey ? `teams/${eventKey}` : undefined, (url) =>
    apiFetcher(url, 'GET')
  );
