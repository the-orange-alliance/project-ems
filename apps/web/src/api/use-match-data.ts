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
import { localClient } from './http-clients.js';

export const matchApi = {
  get: {
    schedule: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<Match<any>[]> => {
      const payload = await localClient.get<unknown[]>(
        `/match/${eventKey}/${tournamentKey}`
      );
      return matchZod.array().parse(payload ?? []);
    },
    all: async (
      eventKey: string,
      tournamentKey: string,
      id: number
    ): Promise<Match<any>> => {
      const payload = await localClient.get<unknown>(
        `/match/all/${eventKey}/${tournamentKey}/${id}`
      );
      if (!payload) {
        throw new Error(
          `Match not found: ${eventKey}/${tournamentKey}/${String(id)}`
        );
      }
      return matchZod.parse(payload);
    },
    event: async (eventKey: string): Promise<Match<any>[]> => {
      const payload = await localClient.get<unknown[]>(`/match/${eventKey}`);
      return matchZod.array().parse(payload ?? []);
    },
    tournament: async (
      eventKey: string,
      tournamentKey: string
    ): Promise<Match<any>[]> => {
      const payload = await localClient.get<unknown[]>(
        `/match/${eventKey}/${tournamentKey}`
      );
      return matchZod.array().parse(payload ?? []);
    },
    participantsForEvent: async (
      eventKey: string
    ): Promise<MatchParticipant[]> => {
      const payload = await localClient.get<unknown[]>(
        `/match/participants/${eventKey}`
      );
      return matchParticipantZod.array().parse(payload ?? []);
    }
  },
  create: {
    schedule: async (params: MatchMakerParams): Promise<Match<any>[]> => {
      const payload = await localClient.post<unknown[]>('/match/create', {
        body: params
      });
      return matchZod.array().parse(payload ?? []);
    },
    scheduleForEvent: async (
      eventKey: string,
      matches: Match<any>[]
    ): Promise<void> => {
      await localClient.post<void>(`/match/${eventKey}`, { body: matches });
    }
  },
  update: {
    match: async (match: Match<any>): Promise<void> => {
      await localClient.patch<void>(
        `/match/${match.eventKey}/${match.tournamentKey}/${match.id}`,
        {
          body: match
        }
      );
    },
    details: async <T extends MatchDetailBase>(
      match: Match<T>
    ): Promise<void> => {
      await localClient.patch<void>(
        `/match/details/${match.eventKey}/${match.tournamentKey}/${match.id}`,
        {
          body: match.details
        }
      );
    },
    participants: async (
      key: MatchKey,
      participants: MatchParticipant[]
    ): Promise<void> => {
      await localClient.patch<void>(
        `/match/participants/${key.eventKey}/${key.tournamentKey}/${key.id}`,
        {
          body: participants
        }
      );
    }
  },
  delete: {
    matches: async (eventKey: string, tournamentKey: string): Promise<void> => {
      await localClient.delete<void>(`/match/${eventKey}/${tournamentKey}`);
    }
  },
  patchWholeMatch: async (match: Match<any>): Promise<void> => {
    const promises: Promise<any>[] = [];
    promises.push(matchApi.update.match(match));
    if (match.details) {
      promises.push(matchApi.update.details(match));
    }
    if (match.participants) {
      promises.push(
        matchApi.update.participants(
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
  }
};

export const useMatchAll = (
  key?: MatchKey | null
): SWRResponse<Match<any>, ApiResponseError> =>
  useSWR<
    Match<any>,
    ApiResponseError,
    readonly [string, string, string, number] | null
  >(
    key
      ? (['/match/all', key.eventKey, key.tournamentKey, key.id] as const)
      : null,
    ([, eventKey, tournamentKey, id]) =>
      matchApi.get.all(eventKey, tournamentKey, id),
    {
      revalidateOnFocus: false
    }
  );

export const useMatchesForEvent = (
  eventKey: string | null | undefined
): SWRResponse<Match<any>[], ApiResponseError> =>
  useSWR<Match<any>[], ApiResponseError, readonly [string, string] | null>(
    eventKey ? (['/match', eventKey] as const) : null,
    ([, eKey]) => matchApi.get.event(eKey),
    { revalidateOnFocus: false }
  );

export const useMatchesForTournament = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<Match<any>[], ApiResponseError> =>
  useSWR<
    Match<any>[],
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey && tournamentKey
      ? (['/match', eventKey, tournamentKey] as const)
      : null,
    ([, eKey, tKey]) => matchApi.get.tournament(eKey, tKey),
    { revalidateOnFocus: false }
  );

export const useMatchParticipantsForEvent = (
  eventKey: string | null | undefined
): SWRResponse<MatchParticipant[], ApiResponseError> =>
  useSWR<
    MatchParticipant[],
    ApiResponseError,
    readonly [string, string] | null
  >(
    eventKey ? (['/match/participants', eventKey] as const) : null,
    ([, eKey]) => matchApi.get.participantsForEvent(eKey),
    { revalidateOnFocus: false }
  );
