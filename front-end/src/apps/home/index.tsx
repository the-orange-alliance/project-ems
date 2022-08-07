import { FC } from 'react';
import Grid from '@mui/material/Grid';
import DefaultLayout from '../../layouts/DefaultLayout';
import AppCard, { AppCardProps } from '../../components/AppCard/AppCard';

import toaLogo from '../../assets/images/toa-logo.png';
import twitchLogo from '../../assets/images/twitch-logo.png';
import audienceDisplayLogo from '../../assets/images/audience-display-logo.png';
import settingsLogo from '../../assets/images/settings-logo.png';
import { useLoginAttempt } from '../../api/ApiProvider';

const GridAppCard = (props: AppCardProps) => (
  <Grid item xs={5} md={3}>
    <AppCard {...props} />
  </Grid>
);

const HomeApp: FC = () => {
  const { data, error } = useLoginAttempt('localhost', 'admin');

  return (
    <DefaultLayout>
      <div>
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
          <GridAppCard title='Settings' imgSrc={settingsLogo} to='/settings' />
        </Grid>
        <div>
          {data && <span>{JSON.stringify(data)}</span>}
          {error && <span>{JSON.stringify(error)}</span>}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default HomeApp;
