import { clientFetcher } from '@toa-lib/client';
import { ApiResponseError, Team } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const postTeams = async (
  eventKey: string,
  teams: Team[]
): Promise<void> => clientFetcher(`teams/${eventKey}`, 'POST', teams);

export const patchTeam = async (
  eventKey: string,
  teamKey: number,
  team: Team
): Promise<void> =>
  clientFetcher(`teams/${eventKey}/${teamKey}`, 'PATCH', team);

export const deleteTeam = async (team: Team): Promise<void> =>
  clientFetcher(`teams/${team.eventKey}/${team.teamKey}`, `DELETE`, team);

export const useTeams = (): SWRResponse<Team[], ApiResponseError> =>
  useSWR('teams', (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });
