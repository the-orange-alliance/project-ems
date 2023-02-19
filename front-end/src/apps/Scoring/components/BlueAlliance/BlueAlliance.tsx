import { FC } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TeamStatusRow from '../Status/TeamStatusRow';
import { useRecoilValue } from 'recoil';
import { currentMatchSelector } from 'src/stores/NewRecoil';

const BlueAlliance: FC = () => {
  const match = useRecoilValue(currentMatchSelector);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);
  return (
    <Paper
      className='blue-bg-imp'
      sx={{ paddingBottom: (theme) => theme.spacing(2) }}
    >
      <Grid container spacing={3}>
        <Grid item md={8}>
          {blueAlliance?.map((p) => (
            <TeamStatusRow key={p.id} id={p.id} />
          ))}
        </Grid>
        {/* <Grid item md={4}>
          <BlueScoreBreakdown />
        </Grid> */}
      </Grid>
    </Paper>
  );
};

export default BlueAlliance;
