import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import {
  loadedMatchKey,
  matchInProgressParticipants,
  matchStateAtom
} from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { useButtonState } from '../../util/ButtonState';
import { sendPrestart } from 'src/api/SocketProvider';
import { patchMatchParticipants } from 'src/api/ApiProvider';

const PrestartButton: FC = () => {
  const { prestartEnabled } = useButtonState();
  const [state, setState] = useRecoilState(matchStateAtom);
  const selectedMatchKey = useRecoilValue(loadedMatchKey);

  const canCancelPrestart =
    state !== MatchState.PRESTART_READY &&
    state <= MatchState.MATCH_IN_PROGRESS;

  useEffect(() => {
    if (selectedMatchKey && state === MatchState.MATCH_NOT_SELECTED) {
      setState(MatchState.PRESTART_READY);
    }
  }, [selectedMatchKey, state]);

  const prestart = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const participants = await snapshot.getPromise(
          matchInProgressParticipants
        );
        if (selectedMatchKey && participants) {
          console.log(selectedMatchKey);
          sendPrestart(selectedMatchKey);
          setState(MatchState.PRESTART_COMPLETE);
          // Send updated participant list.
          await patchMatchParticipants(participants);
        }
      },
    [selectedMatchKey]
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
