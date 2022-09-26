import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState } from 'recoil';
import { matchStateAtom, timer } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { sendAbortMatch, sendStartMatch } from 'src/api/SocketProvider';

const StartMatchButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);

  const { startMatchEnabled } = useButtonState();

  const startMatch = () => {
    timer.start();
    sendStartMatch();
    setState(MatchState.MATCH_IN_PROGRESS);
  };

  const abortMatch = () => {
    timer.stop();
    sendAbortMatch();
    setState(MatchState.MATCH_ABORTED);
    setState(MatchState.PRESTART_READY);
  };

  return state === MatchState.MATCH_IN_PROGRESS ? (
    <Button
      disabled={!startMatchEnabled}
      color='error'
      fullWidth
      variant='contained'
      onClick={abortMatch}
    >
      Abort Match
    </Button>
  ) : (
    <Button
      disabled={!startMatchEnabled}
      color='error'
      fullWidth
      variant='contained'
      onClick={startMatch}
    >
      Start Match
    </Button>
  );
};

export default StartMatchButton;
