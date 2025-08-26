import { MatchState, QUALIFICATION_LEVEL } from '@toa-lib/models';
import { useMatchControl } from './use-match-control.js';
import { sendPostResults } from 'src/api/use-socket.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import { useNextUnplayedMatch } from './use-next-unplayed-match.js';
import {
  resultsSyncAlliances,
  resultsSyncMatch,
  resultsSyncRankings
} from 'src/api/use-results-sync.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { useAtomValue } from 'jotai';
import {
  eventKeyAtom,
  matchAtom,
  matchIdAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import { isSocketConnectedAtom } from 'src/stores/state/ui.js';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const tournament = useCurrentTournament();
  const { data: matches, mutate: setMatches } = useMatchesForTournament(
    eventKey,
    tournamentKey
  );
  const getNextUnplayed = useNextUnplayedMatch();
  const { apiKey, platform } = useSyncConfig();

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        const socketConnected = get(isSocketConnectedAtom);
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

        // Update local match array with posted = 1 if all were successful
        if (matches) {
          const copy = [...matches];
          const index = copy.findIndex(
            (m) => m.id === match.id && m.tournamentKey === match.tournamentKey
          );
          if (index >= 0) {
            copy[index] = { ...copy[index], uploaded: successMatch && successRankings && successAlliances ? 1 : 0 };
            setMatches(copy);
          }
        }

        // Set the current match to the next
        const next = await getNextUnplayed();
        if (next) {
          // Setthing this will auto-update the match atom
          set(matchIdAtom, next.id);
        }

        fieldControl?.postResultsForField?.();
        sendPostResults();
        setState(MatchState.RESULTS_POSTED);
      },
      [canPostResults, setState, matches, eventKey, tournamentKey, tournament]
    )
  );
};
