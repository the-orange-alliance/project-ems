import { Button } from '@mui/material';
import { FC, useState } from 'react';

export const PrestartButton: FC = () => {
  const [canPrestart, setCanPrestart] = useState(true);
  const prestart = () => setCanPrestart(false);
  const cancelPrestart = () => setCanPrestart(true);
  return canPrestart ? (
    <Button fullWidth color='warning' variant='contained' onClick={prestart}>
      Prestart
    </Button>
  ) : (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={cancelPrestart}
    >
      Cancel Prestart
    </Button>
  );
};
