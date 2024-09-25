import { FC } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import { DefaultLayout } from '@layouts/default-layout';
import { MatchControl } from './match-control/match-control';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs';
import { MatchHeader } from './match-header/match-header';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { Box } from '@mui/material';

export const ScorekeeperApp: FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: teams } = useTeamsForEvent(event?.eventKey);

  return (
    <>
      <DefaultLayout
        containerWidth='xl'
        title={`${event?.eventName} | Scorekeeper App`}
        titleLink={`/${event?.eventKey}`}
      >
        <Box sx={{ marginBottom: (theme) => theme.spacing(3) }}>
          <MatchHeader teams={teams} />
        </Box>
        <Box sx={{ marginBottom: (theme) => theme.spacing(3) }}>
          <MatchControl />
        </Box>
        <Box sx={{ marginBottom: (theme) => theme.spacing(3) }}>
          <ScorekeeperTabs eventKey={event?.eventKey} />
        </Box>
      </DefaultLayout>
    </>
  );
};
