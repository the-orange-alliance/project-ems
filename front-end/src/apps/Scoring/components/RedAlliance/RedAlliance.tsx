import { FC } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TeamStatusRow from '../Status/TeamStatusRow';
import { useRecoilValue } from 'recoil';
import { currentMatchSelector } from 'src/stores/NewRecoil';
import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { useComponents } from 'src/seasons';

const RedAlliance: FC = () => {
  const match = useRecoilValue(currentMatchSelector);
  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const seasonKey = getSeasonKeyFromEventKey(match ? match.eventKey : '');
  const components = useComponents(seasonKey);
  return (
    <Paper
      className='red-bg-imp'
      sx={{ paddingBottom: (theme) => theme.spacing(2) }}
    >
      <Grid container spacing={3}>
        <Grid item md={8}>
          {redAlliance?.map((p) => (
            <TeamStatusRow key={p.teamKey} station={p.station} />
          ))}
        </Grid>
        <Grid item md={4}>
          {components && match && (
            <components.RedScoreBreakdown match={match} />
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RedAlliance;
