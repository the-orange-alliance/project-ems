import { MatchState, QUALIFICATION_LEVEL } from '@toa-lib/models';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { useMatchControl } from './use-match-control';
import { sendPostResults } from 'src/api/use-socket';
import {
  currentEventKeyAtom,
  currentMatchIdAtom,
  currentTournamentKeyAtom,
  matchOccurringAtom,
  socketConnectedAtom
} from 'src/stores/recoil';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';
import { useMatchesForTournament } from 'src/api/use-match-data';
import { useNextUnplayedMatch } from './use-next-unplayed-match';
import {
  resultsSyncAlliances,
  resultsSyncMatch,
  resultsSyncRankings
} from 'src/api/use-results-sync';
import { useSyncConfig } from 'src/hooks/use-sync-config';
import { useCurrentTournament } from 'src/api/use-tournament-data';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const tournament = useCurrentTournament();
  const { data: matches, mutate: setMatches } = useMatchesForTournament(
    eventKey,
    tournamentKey
  );
  const getNextUnplayed = useNextUnplayedMatch();
  const { apiKey, platform } = useSyncConfig();

  return useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const match = await snapshot.getPromise(matchOccurringAtom);
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPostResults) {
          throw new Error('Attempted to post results when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to psot results when there is no match.');
        }

        // Sync match online
        const { success: successMatch } = await resultsSyncMatch(
          match.eventKey,
          match.tournamentKey,
          match.id,
          platform,
          apiKey
        );

        const { success: successRankings } = await resultsSyncRankings(
          match.eventKey,
          match.tournamentKey,
          platform,
          apiKey
        );

        let successAlliances = true;

        if (tournament && tournament.tournamentLevel > QUALIFICATION_LEVEL) {
          successAlliances = (
            await resultsSyncAlliances(
              match.eventKey,
              match.tournamentKey,
              platform,
              apiKey
            )
          ).success;
        }

        // Update local match array with posted = 1
        if (successMatch && successRankings && matches && successAlliances) {
          const copy = [...matches];
          const index = copy.findIndex(
            (m) => m.id === match.id && m.tournamentKey === match.tournamentKey
          );
          if (index >= 0) {
            copy[index] = { ...copy[index], uploaded: 1 };
            setMatches(copy);
          }
        }

        // Set the current match to the next
        const next = await getNextUnplayed();
        if (next) {
          set(currentMatchIdAtom, next.id);
          set(matchOccurringAtom, next);
        }

        fieldControl?.postResultsForField?.();
        sendPostResults();
        setState(MatchState.RESULTS_POSTED);
      },
    [canPostResults, setState, matches, eventKey, tournamentKey, tournament]
  );
};
