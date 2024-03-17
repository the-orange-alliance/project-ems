import { FC, Suspense } from 'react';
import Grid from '@mui/material/Grid';
import DefaultLayout from '@layouts/DefaultLayout';
import AppCard, { AppCardProps } from 'src/components/util/AppCard/AppCard';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';
import AppRoutes from 'src/AppRoutes';

const GridAppCard = (props: AppCardProps) => (
  <Grid item xs={5} md={3}>
    <AppCard {...props} />
  </Grid>
);

const HomeApp: FC = () => {
  const event = useRecoilValue(currentEventSelector);

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
            />
          ))}
        </Grid>
      </DefaultLayout>
    </Suspense>
  );
};

export default HomeApp;
