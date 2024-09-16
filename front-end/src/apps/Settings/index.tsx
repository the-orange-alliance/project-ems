import { FC, useState } from 'react';
import { PaperLayout } from 'src/layouts/paper-layout';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import AudienceDisplaySettingsTab from './tabs/audience';
import MainSettingsTab from './tabs/main';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import { TwoColumnHeader } from 'src/components/util/two-column-header';
import { EventTournamentsDropdown } from 'src/components/dropdowns/event-tournaments-dropdown';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom
} from 'src/stores/recoil';
import { Tournament } from '@toa-lib/models';
import FrcFmsSettingsTab from './tabs/frc-fms';
import { ViewReturn } from 'src/components/buttons/view-return';
// import FrcFmsSettingsTab from './tabs/frc-fms';

export const SettingsApp: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );

  const seasonComponents = useSeasonComponents();
  const [tab, setTab] = useState<any>('0');

  const isFrc = eventKey.toLowerCase().startsWith('frc');

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  return (
    <PaperLayout
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Settings</Typography>}
          right={
            <EventTournamentsDropdown
              eventKey={eventKey}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <Paper sx={{ marginBottom: (theme) => theme.spacing(8) }}>
        <ViewReturn title='Home' href={`/${eventKey}`} sx={{ m: 1 }} />
        {/* Tabs */}
        <TabContext value={tab}>
          <TabList onChange={(e, t) => setTab(t)}>
            <Tab label='Main' value='0' />
            <Tab label='Audience Display' value='1' />
            <Tab label='Season' value='2' />
            {isFrc && <Tab label='FRC FMS' value='3' />}
          </TabList>
          <TabPanel value='0'>
            <MainSettingsTab />
          </TabPanel>
          <TabPanel value='1'>
            <AudienceDisplaySettingsTab />
          </TabPanel>
          <TabPanel value='2'>
            {seasonComponents && seasonComponents.Settings && (
              <seasonComponents.Settings />
            )}
          </TabPanel>
          <TabPanel value='3'>
            <FrcFmsSettingsTab />
          </TabPanel>
        </TabContext>
      </Paper>
    </PaperLayout>
  );
};
