import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';

const FieldPrepButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);

  const { fieldPrepEnabled } = useButtonState();

  const updateField = () => {
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
