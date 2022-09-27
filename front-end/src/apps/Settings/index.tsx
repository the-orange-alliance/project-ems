import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { FormControlLabel, FormGroup, Switch } from '@mui/material';
import { useRecoilState } from 'recoil';
import {
  darkModeAtom,
  fieldMotorDuration,
  fieldEndgameStart
} from 'src/stores/Recoil';
import MenuItem from '@mui/material/MenuItem';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [motorDuration, setMotorDuration] = useRecoilState(fieldMotorDuration);
  const [endGameStartHB, setEndgameStart] = useRecoilState(fieldEndgameStart);

  const changeDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  const changeMotorDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setMotorDuration(parseInt(event.target.value));
  };
  const changeEndgameStartHB = (event: SelectChangeEvent) => {
    setEndgameStart(event.target.value);
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
          <FormGroup
            sx={{
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover
              }
            }}
          >
            <FormControlLabel
              control={
                <TextField
                  value={motorDuration}
                  onChange={changeMotorDuration}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Field Preparation Motor Duration
                </Typography>
              }
              labelPlacement='start'
              sx={{ padding: (theme) => theme.spacing(2) }}
            />
          </FormGroup>
          <FormGroup
            sx={{
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover
              }
            }}
          >
            <FormControlLabel
              control={
                <Select
                  value={endGameStartHB}
                  label='Speed'
                  onChange={changeEndgameStartHB}
                >
                  <MenuItem value={'slow'}>Slow</MenuItem>
                  <MenuItem value={'medium'}>Medium</MenuItem>
                  <MenuItem value={'fast'}>Fast</MenuItem>
                </Select>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  End Game Start Heartbeat
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
