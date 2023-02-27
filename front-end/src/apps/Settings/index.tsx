import { FC } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import {
  darkModeAtom,
  displayChromaKeyAtom,
  teamIdentifierAtom
} from 'src/stores/NewRecoil';
import SwitchSetting from './components/SwitchSetting';
import TextSetting from './components/TextSetting';
import DropdownSetting from './components/DropdownSetting';
import { TeamKeys } from '@toa-lib/models';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useRecoilState(teamIdentifierAtom);

  return (
    <DefaultLayout>
      <Paper sx={{ marginBottom: (theme) => theme.spacing(8) }}>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Settings</Typography>
        </Box>
        <Divider />
        <Box>
          <SwitchSetting
            name='Dark Mode'
            value={darkMode}
            onChange={setDarkMode}
          />
          <TextSetting
            name='Audience Display Chroma'
            value={chromaKey}
            onChange={setChromaKey}
          />
          <DropdownSetting
            name='Team Identifier'
            value={teamIdentifier}
            options={TeamKeys}
            onChange={setTeamIdentifier}
          />
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default SettingsApp;
