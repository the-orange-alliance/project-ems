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

export interface MatchHistorySnapshotRow extends Record<string, unknown> {
  eventKey: string;
  tournamentKey: string;
  id: number;
  revision: number;
  actionType: string;
  source: string;
  occurredAtUtc: string;
}

export interface MatchActionEventRow extends Record<string, unknown> {
  actionEventId: number;
  eventKey: string;
  tournamentKey: string;
  id: number;
  revision: number | null;
  sourceEvent: string;
  fieldPath: string | null;
  oldValueJson: string | null;
  newValueJson: string | null;
  deltaNumber: number | null;
  actorId: string | null;
  actorName: string | null;
  clientId: string | null;
  socketId: string | null;
  correlationId: string | null;
  occurredAtUtc: string;
  persisted: number;
}

export interface MatchHistoryResponse {
  key: {
    eventKey: string;
    tournamentKey: string;
    id: number;
  };
  history: {
    base: MatchHistorySnapshotRow[];
    details: MatchHistorySnapshotRow[];
  };
  actions: MatchActionEventRow[];
}

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
    },
    history: async (
      eventKey: string,
      tournamentKey: string,
      id: number,
      options?: {
        includeActions?: boolean;
        limit?: number;
        startRevision?: number;
        endRevision?: number;
      }
    ): Promise<MatchHistoryResponse> => {
      const params = new URLSearchParams();
      if (options?.includeActions !== undefined) {
        params.set('includeActions', String(options.includeActions));
      }
      if (typeof options?.limit === 'number') {
        params.set('limit', String(options.limit));
      }
      if (typeof options?.startRevision === 'number') {
        params.set('startRevision', String(options.startRevision));
      }
      if (typeof options?.endRevision === 'number') {
        params.set('endRevision', String(options.endRevision));
      }
      const query = params.size > 0 ? `?${params.toString()}` : '';
      const payload = await localClient.get<MatchHistoryResponse>(
        `/match/history/${eventKey}/${tournamentKey}/${id}${query}`
      );
      if (!payload) {
        throw new Error(
          `Match history not found: ${eventKey}/${tournamentKey}/${String(id)}`
        );
      }
      return payload;
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

export const useMatchHistory = (
  key?: MatchKey | null,
  options?: {
    includeActions?: boolean;
    limit?: number;
    startRevision?: number;
    endRevision?: number;
  }
): SWRResponse<MatchHistoryResponse, ApiResponseError> =>
  useSWR<
    MatchHistoryResponse,
    ApiResponseError,
    | readonly [string, string, string, number, number, number, number, number]
    | null
  >(
    key
      ? ([
          '/match/history',
          key.eventKey,
          key.tournamentKey,
          key.id,
          options?.includeActions === false ? 0 : 1,
          options?.limit ?? 200,
          options?.startRevision ?? 0,
          options?.endRevision ?? 0
        ] as const)
      : null,
    ([, eventKey, tournamentKey, id, includeActions, limit, start, end]) =>
      matchApi.get.history(eventKey, tournamentKey, id, {
        includeActions: includeActions === 1,
        limit,
        startRevision: start > 0 ? start : undefined,
        endRevision: end > 0 ? end : undefined
      }),
    { revalidateOnFocus: false }
  );
