import { FC } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { MatchControl } from './match-control/match-control';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs';
import { MatchHeader } from './match-header/match-header';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { Box } from '@mui/material';
import { SyncMatchesToRecoil } from 'src/components/sync-effects/sync-matches-to-recoi';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncMatchOccurringToRecoil } from 'src/components/sync-effects/sync-match-occurring-to-recoil';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart';

export const ScorekeeperApp: FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: teams } = useTeamsForEvent(event?.eventKey);
  return (
    <>
      <SyncMatchStateToRecoil />
      <SyncMatchesToRecoil />
      <SyncMatchOccurringToRecoil />
      <SyncOnPrestart />
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
