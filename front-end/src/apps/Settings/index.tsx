import { FC } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import { darkModeAtom, displayChromaKeyAtom } from 'src/stores/NewRecoil';
import SwitchSetting from './components/SwitchSetting';
import TextSetting from './components/TextSetting';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);

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
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default SettingsApp;
