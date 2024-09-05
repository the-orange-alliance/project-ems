import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { MatchState } from '@toa-lib/models';
import { matchOccurringAtom, socketConnectedAtom } from 'src/stores/recoil';
import { patchMatch, patchMatchParticipants } from 'src/api/use-match-data';
import { DateTime } from 'luxon';
import { sendPrestart } from 'src/api/use-socket';

export const usePrestartCallback = () => {
  const { canPrestart, setState } = useMatchControl();
  return useRecoilCallback(
    ({ snapshot }) =>
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
        sendPrestart({ eventKey, tournamentKey, id });
        setState(MatchState.PRESTART_COMPLETE);
      },
    [canPrestart, setState]
  );
};
