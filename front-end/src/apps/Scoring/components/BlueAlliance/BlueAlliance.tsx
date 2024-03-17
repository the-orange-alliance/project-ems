import { FC } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TeamStatusRow from '../Status/TeamStatusRow';
import { useRecoilValue } from 'recoil';
import { currentMatchSelector } from 'src/stores/NewRecoil';
import NoShowStatus from '../Status/NoShowStatus';
import { Typography } from '@mui/material';
import DisqualifiedStatus from '../Status/DisqualifiedStatus';

const BlueAlliance: FC = () => {
  const match = useRecoilValue(currentMatchSelector);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);
  return (
    <Paper
      className='blue-bg-imp'
      sx={{ paddingBottom: (theme) => theme.spacing(1) }}
    >
      <Grid container spacing={3}>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Team
          </Typography>
        </Grid>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Card Status
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            No Show
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            DQ
          </Typography>
        </Grid>
      </Grid>
      {blueAlliance?.map((p) => (
        <Grid key={`${p.teamKey}-${p.station}`} container spacing={3}>
          <Grid item md={8}>
            <TeamStatusRow key={p.teamKey} station={p.station} />
          </Grid>
          <Grid item md={2}>
            <NoShowStatus key={`no-show-${p.teamKey}`} station={p.station} />
          </Grid>
          <Grid item md={2}>
            <DisqualifiedStatus key={`dq-${p.teamKey}`} station={p.station} />
          </Grid>
        </Grid>
      ))}
    </Paper>
  );
};

export default BlueAlliance;
