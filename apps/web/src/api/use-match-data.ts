import { apiFetcher } from '@toa-lib/client';
import {
  MatchMakerParams,
  Match,
  MatchDetailBase,
  MatchKey,
  MatchParticipant,
  ApiResponseError,
  matchZod,
  matchParticipantZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

export const getMatchSchedule = async (
  eventKey: string,
  tournamentKey: string
): Promise<Match<any>[]> =>
  apiFetcher(
    `match/${eventKey}/${tournamentKey}`,
    'GET',
    undefined,
    matchZod.array().parse
  );

export const createMatchSchedule = async (
  params: MatchMakerParams
): Promise<Match<any>[]> =>
  apiFetcher('match/create', 'POST', params, matchZod.array().parse);

export const postMatchSchedule = async (
  eventKey: string,
  matches: Match<any>[]
): Promise<void> => apiFetcher(`match/${eventKey}`, 'POST', matches);

export const patchMatch = async (match: Match<any>): Promise<void> =>
  apiFetcher(
    `match/${match.eventKey}/${match.tournamentKey}/${match.id}`,
    'PATCH',
    match
  );

export const patchMatchDetails = async <T extends MatchDetailBase>(
  match: Match<T>
): Promise<void> =>
  apiFetcher(
    `match/details/${match.eventKey}/${match.tournamentKey}/${match.id}`,
    'PATCH',
    match.details
  );

export const patchMatchParticipants = async (
  key: MatchKey,
  participants: MatchParticipant[]
): Promise<void> =>
  apiFetcher(
    `match/participants/${key.eventKey}/${key.tournamentKey}/${key.id}`,
    'PATCH',
    participants
  );

/**
 * Runs a PATCH request to update the entire match, including details and participants.
 * @param match
 * @throws Error - IF ANY REQUEST FAILS, THE DEVELOPER MUST HANDLE THE ERROR APPROPRIATELY.
 */
export const patchWholeMatch = async (match: Match<any>): Promise<void> => {
  const promises: Promise<any>[] = [];
  promises.push(patchMatch(match));
  if (match.details) {
    promises.push(patchMatchDetails(match));
  }
  if (match.participants) {
    promises.push(
      patchMatchParticipants(
        {
          eventKey: match.eventKey,
          tournamentKey: match.tournamentKey,
          id: match.id
        },
        match.participants
      )
    );
  }
  await Promise.all(promises);
};

export const deleteMatches = async (
  eventKey: string,
  tournamentKey: string
): Promise<void> => apiFetcher(`match/${eventKey}/${tournamentKey}`, 'DELETE');

export const useMatchAll = (
  key?: MatchKey | null
): SWRResponse<Match<any>, ApiResponseError> =>
  useSWR<Match<any>>(
    key ? `match/all/${key.eventKey}/${key.tournamentKey}/${key.id}` : '',
    (url) => apiFetcher(url, 'GET'),
    {
      revalidateOnFocus: false
    }
  );

export const useMatchesForEvent = (
  eventKey: string | null | undefined
): SWRResponse<Match<any>[], ApiResponseError> =>
  useSWR<Match<any>[]>(
    eventKey ? `match/${eventKey}` : undefined,
    (url) => apiFetcher(url, 'GET', undefined, matchZod.array().parse),
    { revalidateOnFocus: false }
  );

export const useMatchesForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<Match<any>[], ApiResponseError> =>
  useSWR<Match<any>[]>(
    eventKey && tournamentKey
      ? `match/${eventKey}/${tournamentKey}`
      : undefined,
    (url) => apiFetcher(url, 'GET', undefined, matchZod.array().parse),
    { revalidateOnFocus: false }
  );

export const useMatchParticipantsForEvent = (
  eventKey: string | null | undefined
): SWRResponse<MatchParticipant[], ApiResponseError> =>
  useSWR<MatchParticipant[]>(
    eventKey ? `match/participants/${eventKey}` : undefined,
    (url: string) =>
      apiFetcher(url, 'GET', undefined, matchParticipantZod.array().parse)
  );
