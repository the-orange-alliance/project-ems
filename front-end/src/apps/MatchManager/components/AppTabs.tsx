import { FC, SyntheticEvent, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TabPanel from 'src/components/TabPanel/TabPanel';
import { useRecoilValue } from 'recoil';
import { selectedTournamentLevel } from 'src/stores/Recoil';
import SetupTeams from './SetupTeams';
import SetupSchedule from './SetupSchedule';
import SetupMatches from './SetupMatches';

const AppTabs: FC = () => {
  const tournament = useRecoilValue(selectedTournamentLevel);

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
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <SetupTeams />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <SetupSchedule />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <SetupMatches />
      </TabPanel>
    </Box>
  );
};

export default AppTabs;
