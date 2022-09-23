import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import { useRecoilState, useRecoilValue } from 'recoil';
import { matchStateAtom, selectedMatchKeyAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { useButtonState } from '../../util/ButtonState';
import { sendPrestart } from 'src/api/SocketProvider';

const PrestartButton: FC = () => {
  const { prestartEnabled } = useButtonState();
  const [state, setState] = useRecoilState(matchStateAtom);
  const selectedMatchKey = useRecoilValue(selectedMatchKeyAtom);

  const canCancelPrestart =
    state !== MatchState.PRESTART_READY &&
    state <= MatchState.MATCH_IN_PROGRESS;

  useEffect(() => {
    if (selectedMatchKey && state === MatchState.MATCH_NOT_SELECTED) {
      setState(MatchState.PRESTART_READY);
    }
  }, [selectedMatchKey, state]);

  const prestart = async () => {
    if (selectedMatchKey) {
      sendPrestart(selectedMatchKey);
      setState(MatchState.PRESTART_COMPLETE);
    }
  };

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
