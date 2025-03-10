import { Button, Stack } from '@mui/material';
import { FC } from 'react';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';

export const ScorekeeperOptions: FC = () => {
  const fieldControl = useSeasonFieldControl();

  return (
    <Stack spacing={2}>
      <Button variant={'contained'} onClick={fieldControl?.clearField}>
        Force Field Green
      </Button>
      <Button variant={'contained'} onClick={fieldControl?.prepareField}>
        Force Prep Field
      </Button>
      <Button variant={'contained'} onClick={fieldControl?.awardsMode}>
        Awards Mode
      </Button>
    </Stack>
  );
};
