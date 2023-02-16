import { FC } from 'react';
import Grid from '@mui/material/Grid';
import DefaultLayout from '@layouts/DefaultLayout';
import AppCard, { AppCardProps } from '@components/AppCard/AppCard';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';

import twitchLogo from 'src/assets/images/twitch-logo.png';
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
  return (
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
        {/* <GridAppCard title='Scoring App' to='/scoring' />
        <GridAppCard title='Referee App' to='/referee' />
        <GridAppCard title='Admin App' to='/admin' />
        <GridAppCard title='Field Debugger' to='/fcs-debug' />
        <GridAppCard title='Account Manager' to='/accounts' />
        <GridAppCard
          title='Streaming App'
          to='/streaming'
          imgSrc={twitchLogo}
        />
        <GridAppCard
          title='Audience Display'
          imgSrc={audienceDisplayLogo}
          to='/audience'
        />
        <GridAppCard
          title='Queueing Display'
          imgSrc={audienceDisplayLogo}
          to='/queueing'
        />
        <GridAppCard title='Report App' to='/reports' />
        <GridAppCard title='Settings' imgSrc={settingsLogo} to='/settings' />
        <GridAppCard title='JB App' imgSrc={revLogo} to='/jb' /> */}
      </Grid>
    </DefaultLayout>
  );
};

export default HomeApp;
