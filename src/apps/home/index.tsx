import { FC } from 'react';
import Grid from '@mui/material/Grid';
import DefaultLayout from '../../layouts/default-layout';
import AppCard, {
  AppCardProps
} from '../../components/list-item-link/app-card';

import toaLogo from '../../assets/images/toa-logo.png';
import twitchLogo from '../../assets/images/twitch-logo.png';
import audienceDisplayLogo from '../../assets/images/audience-display-logo.png';

const GridAppCard = (props: AppCardProps) => (
  <Grid item xs={5} md={3}>
    <AppCard {...props} />
  </Grid>
);

const HomeApp: FC = () => {
  return (
    <DefaultLayout>
      <Grid container spacing={4} columns={15}>
        <GridAppCard title='Event Manager' to='/event-manager' />
        <GridAppCard title='Match Manager' />
        <GridAppCard title='Audience Display' imgSrc={audienceDisplayLogo} />
        <GridAppCard title='Scoring App' />
        <GridAppCard
          title='Live Broadcast'
          href='https://twitch.tv/theorangealliance2'
          imgSrc={twitchLogo}
        />
        <GridAppCard
          title='TOA Link'
          href='https://theorangealliance.org'
          imgSrc={toaLogo}
        />
        <GridAppCard title='Admin App' />
        <GridAppCard title='Advancement Manager' />
        <GridAppCard title='Report App' />
        <GridAppCard title='Settings' />
      </Grid>
    </DefaultLayout>
  );
};

export default HomeApp;
