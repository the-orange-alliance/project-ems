import { apiFetcher, clientFetcher } from '@toa-lib/client';
import { Tournament, tournamentZod } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import useSWR, { SWRConfiguration } from 'swr';

export const getTournaments = async (
  eventKey: string | null | undefined
): Promise<Tournament[]> => apiFetcher(`tournament/${eventKey}`, 'GET');

export const postTournaments = async (
  tournaments: Tournament[]
): Promise<void> => clientFetcher('tournament', 'POST', tournaments);

export const patchTournament = async (tournament: Tournament): Promise<void> =>
  clientFetcher(
    `tournament/${tournament.eventKey}/${tournament.tournamentKey}`,
    'PATCH',
    tournament
  );

export const useTournamentsForEvent = (
  eventKey: string | null | undefined,
  config?: SWRConfiguration
) =>
  useSWR<Tournament[]>(
    eventKey ? `tournament/${eventKey}` : undefined,
    (url) => apiFetcher(url, 'GET', undefined, tournamentZod.array().parse),
    config ?? { revalidateOnFocus: false }
  );

export const useCurrentTournament = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  return tournaments?.find((t) => t.tournamentKey === tournamentKey);
};
