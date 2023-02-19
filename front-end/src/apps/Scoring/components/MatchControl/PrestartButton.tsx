import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import { MatchState } from '@toa-lib/models';
import { useButtonState } from '../../util/ButtonState';
import { sendPrestart } from 'src/api/SocketProvider';
import { patchMatchParticipants } from 'src/api/ApiProvider';
import {
  currentMatchSelector,
  matchInProgressParticipantsSelector,
  matchStateAtom
} from 'src/stores/NewRecoil';

const PrestartButton: FC = () => {
  const { prestartEnabled } = useButtonState();
  const [state, setState] = useRecoilState(matchStateAtom);
  const currentMatch = useRecoilValue(currentMatchSelector);

  const canCancelPrestart =
    state !== MatchState.PRESTART_READY &&
    state <= MatchState.MATCH_IN_PROGRESS;

  useEffect(() => {
    if (currentMatch && state === MatchState.MATCH_NOT_SELECTED) {
      setState(MatchState.PRESTART_READY);
    }
  }, [currentMatch, state]);

  const prestart = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const participants = await snapshot.getPromise(
          matchInProgressParticipantsSelector
        );
        if (currentMatch && participants) {
          // Send updated participant list.
          const { eventKey, tournamentKey, id } = currentMatch;
          await patchMatchParticipants(participants);
          sendPrestart({ eventKey, tournamentKey, id });
          setState(MatchState.PRESTART_COMPLETE);
        }
      },
    [currentMatch]
  );

  const cancelPrestart = async () => {
    setState(MatchState.PRESTART_READY);
  };

  return canCancelPrestart ? (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={cancelPrestart}
      disabled={!prestartEnabled}
    >
      Cancel Prestart
    </Button>
  ) : (
    <Button fullWidth color='warning' variant='contained' onClick={prestart}>
      Prestart
    </Button>
  );
};

export default PrestartButton;
