import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import {
  getDefaultMatchDetailsBySeasonKey,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import {
  currentTournamentKeyAtom,
  matchOccurringAtom,
  socketConnectedAtom
} from 'src/stores/recoil';
import { patchMatch, patchMatchParticipants } from 'src/api/use-match-data';
import { DateTime } from 'luxon';
import { once, sendPrestart, sendUpdate } from 'src/api/use-socket';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';

export const usePrestartCallback = () => {
  const { canPrestart, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const match = await snapshot.getPromise(matchOccurringAtom);
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
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
        if (prestartTime) {
          await patchMatch({ ...match, prestartTime });
        }
        await patchMatchParticipants(
          { eventKey, tournamentKey, id },
          match.participants
        );
        let currentMatch = match;
        if (!match.details) {
          currentMatch = {
            ...match,
            details: {
              ...getDefaultMatchDetailsBySeasonKey(
                match.eventKey.split('-')[0].toLowerCase()
              ),
              tournamentKey: match.tournamentKey,
              eventKey: match.eventKey,
              id: match.id
            }
          };
          set(matchOccurringAtom, currentMatch);
          set(currentTournamentKeyAtom, currentMatch.tournamentKey);
        }
        fieldControl?.prestartField?.();
        // Once we recieve the prestart response, immediately send update to load socket with match
        once(MatchSocketEvent.PRESTART, () => sendUpdate(currentMatch));
        // Send prestart to server
        sendPrestart({ eventKey, tournamentKey, id });
        setState(MatchState.PRESTART_COMPLETE);
      },
    [canPrestart, setState]
  );
};

export const useCancelPrestartCallback = () => {
  const { canCancelPrestart, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useRecoilCallback(() => async () => {
    if (!canCancelPrestart) {
      throw new Error('Attempted to cancel prestart when not allowed.');
    }
    fieldControl?.cancelPrestartForField?.();
    setState(MatchState.PRESTART_READY);
  });
};
