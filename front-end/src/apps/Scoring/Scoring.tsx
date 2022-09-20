import { FC } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Grid from '@mui/material/Grid';
import MatchControl from './components/MatchControl/MatchControl';
import MatchSelection from './components/MatchSelection/MatchSelection';

const ScoringApp: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <MatchControl />
      <Grid
        sx={{ marginTop: (theme) => theme.spacing(1) }}
        container
        spacing={3}
      >
        <Grid item xs={12} sm={6} md={4}>
          <MatchSelection />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MatchSelection />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MatchSelection />
        </Grid>
      </Grid>
    </DefaultLayout>
  );
};

export default ScoringApp;
