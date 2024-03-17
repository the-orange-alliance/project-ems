import { FC, SyntheticEvent, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TabPanel from 'src/components/util/TabPanel/TabPanel';
import { useRecoilValue } from 'recoil';
import { currentTournamentSelector } from 'src/stores/NewRecoil';
import MatchSelection from './components/MatchSelection/MatchSelection';
import { Card } from '@mui/material';

export const ScoringTabs: FC = () => {
  const tournament = useRecoilValue(currentTournamentSelector);

  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
  }, [tournament]);

  const handleChange = (event: SyntheticEvent, newValue: number) =>
    setValue(newValue);

  return (
    <Card sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label='Schedule' />
          <Tab label='Score Details' />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0} noPadding>
        <MatchSelection />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <div>hello!</div>
      </TabPanel>
    </Card>
  );
};
