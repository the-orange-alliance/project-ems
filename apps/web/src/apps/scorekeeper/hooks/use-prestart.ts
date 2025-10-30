import { useMatchControl } from './use-match-control.js';
import {
  getDefaultMatchDetailsBySeasonKey,
  MatchSocketEvent,
  MatchState,
  WebhookEvent
} from '@toa-lib/models';
import { patchMatch, patchMatchParticipants } from 'src/api/use-match-data.js';
import { DateTime } from 'luxon';
import { once, sendPrestart, sendUpdate } from 'src/api/use-socket.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { matchAtom, teamsAtom } from 'src/stores/state/event.js';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { isSocketConnectedAtom } from 'src/stores/state/ui.js';
import { useAtomValue } from 'jotai';
import { emitWebhook } from 'src/api/use-webhook-data.js';

export const usePrestartCallback = () => {
  const { canPrestart, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const teams = useAtomValue(teamsAtom);

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        const socketConnected = get(isSocketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPrestart) {
          throw new Error('Attemped to prestart when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to prestart without a match selected.');
        }
        if (!match.participants || match.participants.length <= 0) {
          throw new Error('Attempted to prestart without participants.');
        }
        const { eventKey, tournamentKey, id } = match;

        const prestartTime = DateTime.now().toISO();
        const currentMatch = { ...match, prestartTime };
        await patchMatch(currentMatch);

        currentMatch.participants = currentMatch.participants?.map((p) => ({
          ...p,
          team: p.team || teams?.find((t) => t.teamKey === p.teamKey)
        }));

        await patchMatchParticipants(
          { eventKey, tournamentKey, id },
          match.participants
        );

        if (!currentMatch.details) {
          currentMatch = {
            ...currentMatch,
            details: {
              ...getDefaultMatchDetailsBySeasonKey(
                match.eventKey.split('-')[0].toLowerCase()
              ),
              tournamentKey: match.tournamentKey,
              eventKey: match.eventKey,
              id: match.id
            }
          };
        }
        // Set the match in the atom so that it can be used by the field control. It will update match/tourn/event ids if needed
        set(matchAtom, currentMatch);
        fieldControl?.prestartField?.();
        // Once we recieve the prestart response, immediately send update to load socket with match
        once(MatchSocketEvent.PRESTART, () => sendUpdate(currentMatch));
        // Send prestart to server
        sendPrestart({ eventKey, tournamentKey, id });
        setState(MatchState.PRESTART_COMPLETE);
        emitWebhook(WebhookEvent.PRESTARTED, match);
      },
      [canPrestart, setState, teams]
    )
  );
};

export const useCancelPrestartCallback = () => {
  const { canCancelPrestart, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useCallback(() => {
    if (!canCancelPrestart) {
      throw new Error('Attempted to cancel prestart when not allowed.');
    }
    fieldControl?.cancelPrestartForField?.();
    setState(MatchState.PRESTART_READY);
  }, [canCancelPrestart, setState, fieldControl]);
};
