import { useRecoilCallback } from 'recoil';
import { patchMatchParticipants } from 'src/api/ApiProvider';
import { sendPrestart } from 'src/api/SocketProvider';
import {
  currentMatchSelector,
  matchInProgressParticipantsSelector
} from 'src/stores/NewRecoil';

export const usePrestartCallback = () => {
  const prestart = useRecoilCallback(({ snapshot }) => async () => {
    const currentMatch = await snapshot.getPromise(currentMatchSelector);
    const participants = await snapshot.getPromise(
      matchInProgressParticipantsSelector
    );
    if (currentMatch && participants.length > 0) {
      const { eventKey, tournamentKey, id } = currentMatch;
      await patchMatchParticipants(
        { eventKey, tournamentKey, id },
        participants
      );
      sendPrestart({ eventKey, tournamentKey, id });
    }
  });
  return prestart;
};
