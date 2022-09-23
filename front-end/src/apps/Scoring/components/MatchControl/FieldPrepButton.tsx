import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { fieldMotorDuration, matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { prepareField } from 'src/api/SocketProvider';

const FieldPrepButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const motorDuration = useRecoilValue(fieldMotorDuration);

  const { fieldPrepEnabled } = useButtonState();

  const updateField = async () => {
    await prepareField(motorDuration);
    setState(MatchState.FIELD_READY);
  };

  return (
    <Button
      disabled={!fieldPrepEnabled}
      color='success'
      fullWidth
      variant='contained'
      onClick={updateField}
    >
      Field Prep
    </Button>
  );
};

export default FieldPrepButton;
