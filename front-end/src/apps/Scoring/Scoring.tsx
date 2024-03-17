import { FC, Suspense } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Grid from '@mui/material/Grid';
import MatchControl from './components/MatchControl/MatchControl';
import RedAlliance from './components/RedAlliance/RedAlliance';
import BlueAlliance from './components/BlueAlliance/BlueAlliance';
import MatchStatus from './components/MatchStatus/MatchStatus';
import UnloadEffect from 'src/components/sync-effects/UnloadEffect';
import PrestartListener from 'src/components/sync-effects/PrestartListener/PrestartListener';
import MatchStateListener from 'src/components/sync-effects/MatchStateListener/MatchStateListener';
import { ScoringTabs } from './ScoringTabs';

const ScoringApp: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <UnloadEffect />
      <MatchControl />
      <Suspense fallback={null}>
        <Grid
          sx={{ marginTop: (theme) => theme.spacing(2) }}
          container
          spacing={3}
        >
          <Grid item xs={12} sm={6} md={5}>
            <RedAlliance />
          </Grid>
          <Grid item xs={12} sm={6} md={2} sx={{ paddingTop: '0 !important' }}>
            <MatchStatus />
          </Grid>
          <Grid item xs={12} sm={6} md={5}>
            <BlueAlliance />
          </Grid>
          <Grid item xs={12}>
            <ScoringTabs />
          </Grid>
        </Grid>
      </Suspense>
    </DefaultLayout>
  );
};

export default ScoringApp;
