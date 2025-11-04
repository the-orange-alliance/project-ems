import { MatchState, QUALIFICATION_LEVEL, WebhookEvent } from '@toa-lib/models';
import { useMatchControl } from './use-match-control.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import {
  resultsSyncAlliances,
  resultsSyncMatch,
  resultsSyncRankings
} from 'src/api/use-results-sync.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  eventKeyAtom,
  matchAtom,
  matchIdAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import { useActiveFieldNumbers } from 'src/components/sync-effects/sync-fields.js';
import { matchStatusAtom } from 'src/stores/state/match.js';
import { emitWebhook } from 'src/api/use-webhook-data.js';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
  const [activeFields] = useActiveFieldNumbers();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const tournament = useCurrentTournament();
  const { data: matches, mutate: setMatches } = useMatchesForTournament(
    eventKey,
    tournamentKey
  );
  const { apiKey, platform } = useSyncConfig();
  const setStatus = useSetAtom(matchStatusAtom);
  const { events, connected } = useSocketWorker();

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        if (!connected) {
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

        if (matches) {
          // Update local match array with posted = 1 if all were successful
          const copy = [...matches];
          const index = copy.findIndex(
            (m) => m.id === match.id && m.tournamentKey === match.tournamentKey
          );
          if (index >= 0) {
            copy[index] = {
              ...copy[index],
              uploaded:
                successMatch && successRankings && successAlliances ? 1 : 0
            };
            setMatches(copy);
          }

          // Find the next match that hasn't had results posted
          const nextMatch = matches
            .filter((m) => activeFields.includes(m.fieldNumber))
            .sort((a, b) => a.id - b.id)
            .find((m) => m.id >= match.id && m.result < 0);

          if (nextMatch) {
            set(matchIdAtom, nextMatch.id);
          }
        }

        fieldControl?.postResultsForField?.();
        events.postresults();
        setState(MatchState.RESULTS_POSTED);
        setStatus('Ready for Prestart');
        emitWebhook(WebhookEvent.SCORES_POSTED, match);
      },
      [canPostResults, setState, matches, eventKey, tournamentKey, tournament]
    )
  );
};
