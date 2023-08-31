import { FC, SyntheticEvent, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TabPanel from 'src/components/TabPanel/TabPanel';
import { useRecoilValue } from 'recoil';
import { currentTournamentSelector } from 'src/stores/NewRecoil';
import SetupTeams from './SetupTeams';
import SetupSchedule from './schedule/ScheduleParams';
import SetupMatches from './SetupMatches';
import MatchEditor from './MatchEditor';
import { FINALS_LEVEL, ROUND_ROBIN_LEVEL } from '@toa-lib/models';

const AppTabs: FC = () => {
  const tournament = useRecoilValue(currentTournamentSelector);

  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
  }, [tournament]);

  const handleChange = (event: SyntheticEvent, newValue: number) =>
    setValue(newValue);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label='Participating Teams' />
          <Tab label='Schedule Parameters' />
          <Tab label='Match Maker' />
          <Tab label='Match Editor' />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        {tournament?.tournamentLevel === ROUND_ROBIN_LEVEL ||
        tournament?.tournamentLevel === FINALS_LEVEL ? (
          // <SetupAlliances />
          <></>
        ) : (
          <SetupTeams />
        )}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {tournament?.tournamentLevel === ROUND_ROBIN_LEVEL ||
        tournament?.tournamentLevel === FINALS_LEVEL ? (
          // <SetupSchedulePlayoffs />
          <></>
        ) : (
          <SetupSchedule />
        )}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {tournament?.tournamentLevel === ROUND_ROBIN_LEVEL ||
        tournament?.tournamentLevel === FINALS_LEVEL ? (
          // <SetupMatchesPlayoffs />
          <></>
        ) : (
          <SetupMatches />
        )}
      </TabPanel>
      <TabPanel value={value} index={3}>
        <></>
        <MatchEditor />
      </TabPanel>
    </Box>
  );
};

export default AppTabs;
