import { FC } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import DefaultLayout from '../../layouts/DefaultLayout';
import { FormControlLabel, FormGroup, Switch } from '@mui/material';
import { useRecoilState } from 'recoil';
import { darkModeAtom } from '../../stores/Recoil';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);

  const changeDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  return (
    <DefaultLayout containerWidth='md'>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Settings</Typography>
        </Box>
        <Divider />
        <Box>
          <FormGroup
            sx={{
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover
              }
            }}
          >
            <FormControlLabel
              control={<Switch value={darkMode} onChange={changeDarkMode} />}
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Dark Mode
                </Typography>
              }
              labelPlacement='start'
              sx={{ padding: (theme) => theme.spacing(2) }}
            />
          </FormGroup>
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default SettingsApp;
