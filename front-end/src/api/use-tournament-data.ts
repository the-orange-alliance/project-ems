import { apiFetcher, clientFetcher } from '@toa-lib/client';
import { Tournament, tournamentZod } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom
} from 'src/stores/NewRecoil';
import useSWR from 'swr';

export const postTournaments = async (
  tournaments: Tournament[]
): Promise<void> => clientFetcher('tournament', 'POST', tournaments);

export const patchTournament = async (tournament: Tournament): Promise<void> =>
  clientFetcher(
    `tournament/${tournament.eventKey}/${tournament.tournamentKey}`,
    'PATCH',
    tournament
  );

export const useTournamentsForEvent = (eventKey: string | null | undefined) =>
  useSWR<Tournament[]>(eventKey ? `tournament/${eventKey}` : undefined, (url) =>
    apiFetcher(url, 'GET', undefined, tournamentZod.array().parse)
  );

export const useCurrentTournament = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  return tournaments?.find((t) => t.tournamentKey === tournamentKey);
};
