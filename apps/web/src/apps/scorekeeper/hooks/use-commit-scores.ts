import { useAtomValue } from 'jotai';
import { useMatchControl } from './use-match-control.js';
import {
  isPlayoffsTournament,
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
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { eventKeyAtom, matchAtom } from 'src/stores/state/event.js';
import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import { matchStateAtom } from 'src/stores/state/match.js';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';

export const useCommitScoresCallback = () => {
  const { canCommitScores, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useAtomValue(eventKeyAtom);
  const tournament = useCurrentTournament();
  const { data: tournMatches, mutate: updateTournMatches } =
    useMatchesForTournament(eventKey, tournament?.tournamentKey);
  const { events, connected } = useSocketWorker();

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        if (!connected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canCommitScores) {
          throw new Error('Attempted to commit scores when not allowed.');
        }
        if (!tournament) {
          throw new Error(
            'Attempted to commit scores when there is no tournament.'
          );
        }
        if (!match) {
          throw new Error('Attempted to commit scores when there is no match.');
        }
        const pending = { ...match, details: { ...match.details }, active: 0 };
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

        try {
          await patchWholeMatch(pending);
        } catch (e) {
          // Match patch failed
          throw new Error('Failed to commit scores for match.', { cause: e });
        }

        try {
          if (isPlayoffsTournament(tournament)) {
            await recalculatePlayoffsRankings(eventKey, tournamentKey);
          } else {
            await recalculateRankings(eventKey, tournamentKey);
          }
        } catch (e) {
          // Rankings recalc failed
          throw new Error('Failed to calculate rankings.', { cause: e });
        }

        fieldControl?.commitScoresForField?.();
        events.commit({ eventKey, tournamentKey, id });
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
      [canCommitScores, setState, eventKey, tournament, tournMatches]
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
