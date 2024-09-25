import { FC, useEffect } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import { DefaultLayout } from '@layouts/default-layout';
import { MatchControl } from './match-control/match-control';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs';
import { MatchHeader } from './match-header/match-header';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { Box } from '@mui/material';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';
import { useSocket } from 'src/api/use-socket';

export const ScorekeeperApp: FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: teams } = useTeamsForEvent(event?.eventKey);
  const [, connected] = useSocket();
  const fieldControl = useSeasonFieldControl();

  useEffect(() => {
    if (connected) fieldControl?.updateFieldSettings?.();
  }, [connected]);

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
