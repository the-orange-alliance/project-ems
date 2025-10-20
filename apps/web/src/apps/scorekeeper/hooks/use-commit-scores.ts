import { useAtomValue } from 'jotai';
import { useMatchControl } from './use-match-control.js';
import {
  MatchState,
  RESULT_BLUE_WIN,
  RESULT_NOT_PLAYED,
  RESULT_RED_WIN,
  RESULT_TIE,
  WebhookEvent
} from '@toa-lib/models';
import {
  patchWholeMatch,
  useMatchesForTournament
} from 'src/api/use-match-data.js';
import {
  recalculatePlayoffsRankings,
  recalculateRankings
} from 'src/api/use-ranking-data.js';
import { sendCommitScores } from 'src/api/use-socket.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import {
  eventKeyAtom,
  matchAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import { useCallback } from 'react';
import { isSocketConnectedAtom } from 'src/stores/state/ui.js';
import { useAtomCallback } from 'jotai/utils';
import { matchStateAtom } from 'src/stores/state/match.js';
import { emitWebhook } from 'src/api/use-webhook-data.js';

export const useCommitScoresCallback = () => {
  const { canCommitScores, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const { data: tournMatches, mutate: updateTournMatches } =
    useMatchesForTournament(eventKey, tournamentKey);

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        const socketConnected = get(isSocketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canCommitScores) {
          throw new Error('Attempted to commit scores when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to commit scores when there is no match.');
        }
        const pending = { ...match, details: { ...match.details } };
        // Update the result if it hasn't been set yet
        if (pending.result < 0) {
          pending.result =
            pending.redScore > pending.blueScore
              ? RESULT_RED_WIN
              : pending.redScore < pending.blueScore
                ? RESULT_BLUE_WIN
                : pending.redScore === pending.blueScore
                  ? RESULT_TIE
                  : RESULT_NOT_PLAYED;
        }

        // Extract the important keys
        const { eventKey, tournamentKey, id } = pending;

        // Update the metadata in the match detail request
        if (pending.details && pending.details.id < 0) {
          pending.details.id = id;
          pending.details.eventKey = eventKey;
          pending.details.tournamentKey = tournamentKey;
        }

        await patchWholeMatch(pending);
        // TODO - When to calculate rankings vs. playoff rankings?
        if (tournamentKey === 't3' || tournamentKey === 't4') {
          await recalculatePlayoffsRankings(eventKey, tournamentKey);
        } else {
          await recalculateRankings(eventKey, tournamentKey);
        }
        fieldControl?.commitScoresForField?.();
        sendCommitScores({ eventKey, tournamentKey, id });
        setState(MatchState.RESULTS_COMMITTED);

        // Update the match occurring atom
        set(matchAtom, pending);

        // Find match in matches array
        const matchIdx = tournMatches?.findIndex(
          (m) =>
            m.id === id &&
            m.tournamentKey === tournamentKey &&
            m.eventKey === eventKey
        );

        // Update the match in the matches array if found
        if (
          Array.isArray(tournMatches) &&
          matchIdx !== undefined &&
          matchIdx !== -1
        ) {
          const copy = [...tournMatches];
          copy[matchIdx] = pending;
          updateTournMatches(copy);
        }

        emitWebhook(WebhookEvent.COMMITTED, pending);
      },
      [canCommitScores, setState, eventKey, tournamentKey, tournMatches]
    )
  );
};

export const useClearFieldCallback = () => {
  const { canResetField } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useAtomCallback(
    useCallback(
      (get, set) => {
        if (!canResetField) {
          throw new Error('Attempted to clear field when not allowed.');
        }
        fieldControl?.clearField?.();
        set(matchStateAtom, MatchState.RESULTS_READY);
        const match = get(matchAtom); // Trigger matchAtom update
        emitWebhook(WebhookEvent.ALL_CLEAR, match);
      },
      [canResetField]
    )
  );
};
