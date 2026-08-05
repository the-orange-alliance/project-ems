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

/**
 * Promotes yellow cards issued in a match onto the teams that received them, so
 * they carry for the rest of the qualification or playoff phase.
 *
 * The tournament is passed rather than a phase: the server derives the phase
 * from it, so the carry rule has one definition. Entries that are not a yellow
 * are ignored and a team already carrying a card for this phase is untouched,
 * so this is safe to call with every participant of a match rather than
 * pre-filtering. Cards from test and practice tournaments are dropped entirely.
 */
export const postCarriedCards = async (
  eventKey: string,
  tournamentKey: string,
  cards: { teamKey: number; cardStatus: number }[]
): Promise<void> =>
  apiFetcher(`teams/carry-cards/${eventKey}/${tournamentKey}`, 'POST', cards);

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
