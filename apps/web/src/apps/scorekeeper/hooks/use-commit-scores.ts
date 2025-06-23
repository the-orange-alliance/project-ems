import { useAtomValue } from 'jotai';
import { useMatchControl } from './use-match-control.js';
import {
  MatchState,
  RESULT_BLUE_WIN,
  RESULT_NOT_PLAYED,
  RESULT_RED_WIN,
  RESULT_TIE
} from '@toa-lib/models';
import { patchWholeMatch } from 'src/api/use-match-data.js';
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

export const useCommitScoresCallback = () => {
  const { canCommitScores, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);

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
      },
      [canCommitScores, setState, eventKey, tournamentKey]
    )
  );
};

export const useClearFieldCallback = () => {
  const { canResetField, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useAtomCallback(
    useCallback(() => {
      if (!canResetField) {
        throw new Error('Attempted to clear field when not allowed.');
      }
      fieldControl?.clearField?.();
      setState(MatchState.RESULTS_READY);
    }, [])
  );
};
