import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import { CircularProgress, Grid, Typography } from '@mui/material';
import { HardwareInfo, PrestartState } from '@toa-lib/models';

export const PrestartStatus = ({ hw }: { hw: HardwareInfo }) => {
  return (
    <Grid item xs={1} title={hw.lastLog ?? ''}>
      {hw.state === PrestartState.Prestarting ? (
        <CircularProgress size='23px' />
      ) : null}
      {hw.state === PrestartState.Success ? (
        <CheckCircleOutline sx={{ color: 'green' }} />
      ) : null}
      {hw.state === PrestartState.Fail ? (
        <ErrorOutline sx={{ color: 'red' }} />
      ) : null}
      {hw.state === PrestartState.NotReady ? (
        <PauseCircleOutline sx={{ color: 'red' }} />
      ) : null}
      <br />
      <Typography variant='caption'>{hw.name}</Typography>
    </Grid>
  );
};
