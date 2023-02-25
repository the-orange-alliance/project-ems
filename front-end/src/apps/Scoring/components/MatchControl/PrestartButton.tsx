import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MatchState } from '@toa-lib/models';
import { useButtonState } from '../../util/ButtonState';
import { currentMatchSelector, matchStateAtom } from 'src/stores/NewRecoil';
import { usePrestartCallback } from '../../hooks/use-match-control';

const PrestartButton: FC = () => {
  const { prestartEnabled } = useButtonState();
  const [state, setState] = useRecoilState(matchStateAtom);
  const currentMatch = useRecoilValue(currentMatchSelector);

  const prestart = usePrestartCallback();

  const canCancelPrestart =
    state !== MatchState.PRESTART_READY &&
    state <= MatchState.MATCH_IN_PROGRESS;

  useEffect(() => {
    if (currentMatch && state === MatchState.MATCH_NOT_SELECTED) {
      setState(MatchState.PRESTART_READY);
    }
  }, [currentMatch, state]);

  const sendPrestart = async () => {
    try {
      await prestart();
      setState(MatchState.PRESTART_COMPLETE);
    } catch (e) {
      // TODO - better error-handling
      console.log(e);
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
    <Button
      fullWidth
      color='warning'
      variant='contained'
      onClick={sendPrestart}
    >
      Prestart
    </Button>
  );
};

export default PrestartButton;
