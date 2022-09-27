import { FC, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  fieldEndgameStart,
  fieldMotorDuration,
  matchStateAtom
} from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { prepareField } from 'src/api/SocketProvider';

const FieldPrepButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const motorDuration = useRecoilValue(fieldMotorDuration);
  const speed = useRecoilValue(fieldEndgameStart);

  const { fieldPrepEnabled } = useButtonState();

  const [loading, setLoading] = useState(false);

  const updateField = async () => {
    setLoading(true);
    await prepareField(motorDuration, speed);
    setState(MatchState.FIELD_READY);
    setState(MatchState.MATCH_READY);
    setLoading(false);
  };

  return (
    <LoadingButton
      disabled={!fieldPrepEnabled}
      color='success'
      fullWidth
      variant='contained'
      onClick={loading ? undefined : updateField}
      loading={loading}
    >
      Field Prep
    </LoadingButton>
  );
};

export default FieldPrepButton;
