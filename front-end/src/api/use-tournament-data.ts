import { clientFetcher } from '@toa-lib/client';
import { Tournament } from '@toa-lib/models';

export const postTournaments = async (
  tournaments: Tournament[]
): Promise<void> => clientFetcher('tournament', 'POST', tournaments);

export const patchTournament = async (tournament: Tournament): Promise<void> =>
  clientFetcher(
    `tournament/${tournament.eventKey}/${tournament.tournamentKey}`,
    'POST',
    tournament
  );
