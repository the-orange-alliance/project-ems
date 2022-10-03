import { FC, useState } from 'react';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  fieldColor1, fieldColor2,
  fieldCountdownDuration,
  fieldCountdownStyle,
  fieldEndgameHB,
  fieldMatchOverLEDPattern,
  fieldMatchOverStyle,
  fieldMotorDuration,
  fieldMotorReverseDuration,
  fieldTotalSetupDuration,
  matchStateAtom,
  timer
} from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import {
  prepareField,
  sendAbortMatch,
  sendStartMatch
} from 'src/api/SocketProvider';

const StartMatchButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);
  const motorDuration = useRecoilValue(fieldMotorDuration);
  const egSpeed = useRecoilValue(fieldEndgameHB);
  const cdStyle = useRecoilValue(fieldCountdownStyle);
  const cdDuration = useRecoilValue(fieldCountdownDuration);
  const moStyle = useRecoilValue(fieldMatchOverStyle);
  const moPattern = useRecoilValue(fieldMatchOverLEDPattern);
  const color1 = useRecoilValue(fieldColor1);
  const color2 = useRecoilValue(fieldColor2);
  const totalSetupDuration = useRecoilValue(fieldTotalSetupDuration);
  const motorReverseDuration = useRecoilValue(fieldMotorReverseDuration);

  const [loading, setLoading] = useState(false);
  const { startMatchEnabled } = useButtonState();

  const startMatch = async () => {
    setLoading(true);
    await updateField();
    timer.start();
    sendStartMatch();
    setState(MatchState.MATCH_IN_PROGRESS);
    setLoading(false);
  };

  const abortMatch = () => {
    timer.stop();
    sendAbortMatch();
    setState(MatchState.MATCH_ABORTED);
    setState(MatchState.PRESTART_READY);
  };

  const updateField = async () => {
    setLoading(true);
    await prepareField(
      motorDuration,
      egSpeed,
      cdStyle,
      cdDuration,
      moStyle,
      moPattern,
      color1,
      color2,
      totalSetupDuration,
      motorReverseDuration
    );
    setState(MatchState.FIELD_READY);
    setState(MatchState.MATCH_READY);
    setLoading(false);
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
    <LoadingButton
      disabled={!startMatchEnabled}
      color='error'
      fullWidth
      variant='contained'
      onClick={startMatch}
      loading={loading}
    >
      Start Match
    </LoadingButton>
  );
};

export default StartMatchButton;
