import { ApiResponseError, Tournament, tournamentZod } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const tournamentsApi = {
  get: {
    tournaments: async (
      eventKey: string | null | undefined
    ): Promise<Tournament[]> => {
      if (!eventKey) return [];
      const payload = await localClient.get<unknown[]>(
        `/tournament/${eventKey}`
      );
      return tournamentZod.array().parse(payload ?? []);
    }
  },
  create: {
    tournaments: async (tournaments: Tournament[]): Promise<void> => {
      await localClient.post<void>('/tournament', { body: tournaments });
    }
  },
  update: {
    tournament: async (tournament: Tournament): Promise<void> => {
      await localClient.patch<void>(
        `/tournament/${tournament.eventKey}/${tournament.tournamentKey}`,
        {
          body: tournament
        }
      );
    }
  }
};

export const useTournamentsForEvent = (
  eventKey: string | null | undefined,
  config?: SWRConfiguration
): SWRResponse<Tournament[], ApiResponseError> =>
  useSWR<Tournament[], ApiResponseError, readonly [string, string] | null>(
    eventKey ? (['/tournament', eventKey] as const) : null,
    ([, eKey]) => tournamentsApi.get.tournaments(eKey),
    config ?? { revalidateOnFocus: false }
  );

export const useCurrentTournament = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  return tournaments?.find((t) => t.tournamentKey === tournamentKey);
};
