import { apiFetcher } from '@toa-lib/client';
import { ApiResponseError, Team } from '@toa-lib/models';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

export const getTeams = async (
  eventKey: string | null | undefined
): Promise<Team[]> => apiFetcher(`teams/${eventKey}`, 'GET');

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
  eventKey: string | null | undefined,
  config?: SWRConfiguration
): SWRResponse<Team[], ApiResponseError> =>
  useSWR(
    eventKey ? `teams/${eventKey}` : undefined,
    (url) => apiFetcher(url, 'GET'),
    config ?? { revalidateOnFocus: false }
  );
