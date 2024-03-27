import { FC } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { MatchControlHeader } from './match-control/match-control-header';
import { Grid } from '@mui/material';
import { AllianceCard } from './match-control/alliance-card';

export const ScorekeeperApp: FC = () => {
  const { data: event } = useCurrentEvent();
  return (
    <DefaultLayout
      containerWidth='xl'
      title={`${event?.eventName} | Scorekeeper App`}
      titleLink={`/${event?.eventKey}`}
    >
      <Grid
        container
        spacing={3}
        sx={{ marginTop: (theme) => theme.spacing(2) }}
      >
        <Grid item xs={12} sm={6} md={6}>
          <AllianceCard alliance='red' />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <AllianceCard alliance='blue' />
        </Grid>
      </Grid>
      <MatchControlHeader />
    </DefaultLayout>
  );
};
