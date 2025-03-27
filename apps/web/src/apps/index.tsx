import { FC, Suspense } from 'react';
import { Grid } from '@mui/material';
import { DefaultLayout } from '@layouts/default-layout.js';
import { AppCard, AppCardProps } from '@components/util/app-card.js';
import AppRoutes from '../app-routes.js';
import { useCurrentEvent } from '@api/use-event-data.js';

const GridAppCard = (props: AppCardProps) => (
  <Grid item xs={5} md={3}>
    <AppCard {...props} />
  </Grid>
);

const HomeApp: FC = () => {
  const { data: event } = useCurrentEvent();

  return !event ? (
    <Suspense>
      <DefaultLayout title='NO EVENT FOUND'>
        <div>
          Could not load event details. Please refresh page or re-select the
          event.
        </div>
      </DefaultLayout>
    </Suspense>
  ) : (
    <Suspense>
      <DefaultLayout title={event?.eventName}>
        <Grid
          container
          spacing={4}
          columns={15}
          sx={{ marginBottom: (theme) => theme.spacing(4) }}
        >
          {AppRoutes.filter((route) => !route.hidden).map((route, i) => (
            <GridAppCard
              key={`route-${i}`}
              title={route.name}
              to={`${route.path.replaceAll(':eventKey', event?.eventKey)}`}
              imgSrc={route.image ? route.image : undefined}
            />
          ))}
        </Grid>
      </DefaultLayout>
    </Suspense>
  );
};

export default HomeApp;
