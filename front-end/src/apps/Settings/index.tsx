import { FC, useState } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import AudienceDisplaySettingsTab from './tabs/audience';
import MainSettingsTab from './tabs/main';
// import FrcFmsSettingsTab from './tabs/frc-fms';

const SettingsApp: FC = () => {
  const [tab, setTab] = useState<any>('0');

  return (
    <DefaultLayout>
      <Paper sx={{ marginBottom: (theme) => theme.spacing(8) }}>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Settings</Typography>
        </Box>
        <Divider />

        {/* Tabs */}
        <TabContext value={tab}>
          <TabList onChange={(e, t) => setTab(t)}>
            <Tab label='Main' value='0' />
            <Tab label='Audience Display' value='1' />
            {/* <Tab label='FRC FMS' value='2' /> */}
          </TabList>
          <TabPanel value='0'>
            <MainSettingsTab />
          </TabPanel>
          <TabPanel value='1'>
            <AudienceDisplaySettingsTab />
          </TabPanel>
          {/* <TabPanel value='2'>
            <FrcFmsSettingsTab />
          </TabPanel> */}
        </TabContext>
      </Paper>
    </DefaultLayout>
  );
};

export default SettingsApp;
