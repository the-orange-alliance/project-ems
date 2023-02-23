import { useRecoilCallback } from 'recoil';
import { patchMatchParticipants } from 'src/api/ApiProvider';
import { sendPrestart, setDisplays } from 'src/api/SocketProvider';
import {
  currentMatchSelector,
  matchInProgressParticipantsSelector
} from 'src/stores/NewRecoil';

export const usePrestartCallback = () => {
  const prestart = useRecoilCallback(({ snapshot }) => async () => {
    const [currentMatch, participants] = await Promise.all([
      snapshot.getPromise(currentMatchSelector),
      snapshot.getPromise(matchInProgressParticipantsSelector)
    ]);
    if (currentMatch && participants.length > 0) {
      const { eventKey, tournamentKey, id } = currentMatch;
      await patchMatchParticipants(
        { eventKey, tournamentKey, id },
        participants
      );
      sendPrestart({ eventKey, tournamentKey, id });
    } else {
      throw new Error(
        'Tried to prestart, but there was no current match or participants.'
      );
    }
  });
  return prestart;
};

export const useSetDisplaysCallback = () => {
  const set = () => {
    setDisplays();
  };

  return set;
};
