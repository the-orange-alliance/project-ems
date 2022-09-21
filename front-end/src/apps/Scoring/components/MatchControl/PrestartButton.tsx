import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import { useRecoilState, useRecoilValue } from 'recoil';
import { matchStateAtom, selectedMatchKeyAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { useButtonState } from '../../util/ButtonState';

const PrestartButton: FC = () => {
  const { prestartEnabled } = useButtonState();
  const [state, setState] = useRecoilState(matchStateAtom);
  const selectedMatchKey = useRecoilValue(selectedMatchKeyAtom);

  useEffect(() => {
    if (selectedMatchKey && state === MatchState.MATCH_NOT_SELECTED) {
      setState(MatchState.PRESTART_READY);
    }
  }, [selectedMatchKey, state]);

  const prestart = async () => {
    setState(MatchState.PRESTART_COMPLETE);
  };

  const cancelPrestart = async () => {
    setState(MatchState.PRESTART_READY);
  };

  return state === MatchState.PRESTART_READY ? (
    <Button fullWidth color='warning' variant='contained' onClick={prestart}>
      Prestart
    </Button>
  ) : (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={cancelPrestart}
      disabled={!prestartEnabled}
    >
      Cancel Prestart
    </Button>
  );
};

export default PrestartButton;
