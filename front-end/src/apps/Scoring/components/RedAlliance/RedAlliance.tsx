import { FC } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TeamStatusRow from '../Status/TeamStatusRow';
import { useRecoilValue } from 'recoil';
import { loadedMatchParticipantsByAlliance } from 'src/stores/Recoil';

const RedAlliance: FC = () => {
  const redAlliance = useRecoilValue(loadedMatchParticipantsByAlliance('red'));
  return (
    <Paper
      className='red-bg-imp'
      sx={{ paddingBottom: (theme) => theme.spacing(2) }}
    >
      <Grid container spacing={3}>
        <Grid item md={8}>
          {redAlliance.map((p) => (
            <TeamStatusRow key={p.matchParticipantKey} participant={p} />
          ))}
        </Grid>
        <Grid item md={4}>
          88
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RedAlliance;
