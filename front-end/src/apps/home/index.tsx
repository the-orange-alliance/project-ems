import { FC, Suspense } from 'react';
import Grid from '@mui/material/Grid';
import DefaultLayout from '@layouts/DefaultLayout';
import AppCard, { AppCardProps } from '@components/AppCard/AppCard';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';

import audienceDisplayLogo from 'src/assets/images/audience-display-logo.png';
import settingsLogo from 'src/assets/images/settings-logo.png';
import revLogo from 'src/assets/images/rev.png';

const GridAppCard = (props: AppCardProps) => (
  <Grid item xs={5} md={3}>
    <AppCard {...props} />
  </Grid>
);

// TODO - Just incorporate from AppRoutes to eliminate having to modify 2+ places.
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
          <GridAppCard
            title='Event Manager'
            to={`/${event?.eventKey}/event-manager`}
          />
          <GridAppCard
            title='Team Manager'
            to={`/${event?.eventKey}/team-manager`}
          />
          <GridAppCard
            title='Tournament Manager'
            to={`/${event?.eventKey}/tournament-manager`}
          />
          <GridAppCard
            title='Match Manager'
            to={`/${event?.eventKey}/match-manager`}
          />
          <GridAppCard title='Scoring App' to={`/${event?.eventKey}/scoring`} />
          <GridAppCard
            title='Audience Display'
            imgSrc={audienceDisplayLogo}
            to={`/${event?.eventKey}/audience`}
          />
          <GridAppCard title='Referee App' to={`/${event?.eventKey}/referee`} />
          <GridAppCard title='Report App' to={`/${event?.eventKey}/reports`} />
          <GridAppCard title='Admin App' to={`/${event?.eventKey}/admin`} />
          <GridAppCard
            title='Settings'
            imgSrc={settingsLogo}
            to={`/${event?.eventKey}/settings`}
          />
          <GridAppCard
            title='Queueing Display'
            to={`/${event?.eventKey}/queueing`}
          />
          <GridAppCard
            title='JB App'
            imgSrc={revLogo}
            to={`/${event?.eventKey}/jb`}
          />
          <GridAppCard
            title='Streaming App'
            to={`/${event?.eventKey}/streaming`}
          />
          <GridAppCard
            title='Audience Display Settings'
            to={`/audience-display-manager`}
          />
          {/* <GridAppCard title='Field Debugger' to='/fcs-debug' />
        <GridAppCard title='Account Manager' to='/accounts' />
*/}
        </Grid>
      </DefaultLayout>
    </Suspense>
  );
};

export default HomeApp;
