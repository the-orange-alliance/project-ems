import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const FieldPrepButton: FC = () => {
  const { canPrepField, setState } = useMatchControl();
  const prepareField = () => setState(MatchState.FIELD_READY);
  return (
    <Button
      fullWidth
      color='success'
      variant='contained'
      onClick={prepareField}
      disabled={!canPrepField}
    >
      Prep Field
    </Button>
  );
};
