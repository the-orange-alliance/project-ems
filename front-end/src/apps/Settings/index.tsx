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
  fieldEndgameStart,
  fieldEndgameHB,
  fieldEndgameStartDuration,
  fieldCountdownStyle,
  fieldCountdownDuration,
  fieldMatchOverStyle,
  fieldMatchOverLEDPattern,
  fieldColor1,
  fieldColor2,
  fieldTotalSetupDuration
} from 'src/stores/Recoil';
import MenuItem from '@mui/material/MenuItem';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [motorDuration, setMotorDuration] = useRecoilState(fieldMotorDuration);
  const [endgameStartDuration, setEndgameStartDuration] = useRecoilState(
    fieldEndgameStartDuration
  );
  const [endGameStartHB, setEndgameStart] = useRecoilState(fieldEndgameStart);
  const [endGameHB, setEndgameHB] = useRecoilState(fieldEndgameHB);
  const [countdownStyle, setCountdownStyle] =
    useRecoilState(fieldCountdownStyle);
  const [countdownDuration, setCountdownDuration] = useRecoilState(
    fieldCountdownDuration
  );
  const [matchOverStyle, setMatchOverStyle] =
    useRecoilState(fieldMatchOverStyle);
  const [matchOverLEDPattern, setMatchOverLEDPattern] = useRecoilState(
    fieldMatchOverLEDPattern
  );
  const [color1, setColor1] = useRecoilState(fieldColor1);
  const [color2, setColor2] = useRecoilState(fieldColor2);
  const [totalSetupDuration, setTotalSetupDuration] = useRecoilState(fieldTotalSetupDuration);

  const changeDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  const changeMotorDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setMotorDuration(parseInt(event.target.value));
  };
  const changeEndgameStartDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setEndgameStartDuration(parseInt(event.target.value));
  };
  const changeEndgameStartHB = (event: SelectChangeEvent) => {
    setEndgameStart(parseInt(event.target.value));
  };
  const changeEndgameHB = (event: SelectChangeEvent) => {
    setEndgameHB(parseInt(event.target.value));
  };
  const changeCountdownStyle = (event: SelectChangeEvent) => {
    setCountdownStyle(event.target.value);
  };
  const changeCountdownDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setCountdownDuration(parseInt(event.target.value));
  };
  const changeMatchOverStyle = (event: SelectChangeEvent) => {
    setMatchOverStyle(event.target.value);
  };
  const changeMatchOverLEDPattern = (event: ChangeEvent<HTMLInputElement>) => {
    setMatchOverLEDPattern(parseInt(event.target.value));
  };
  const changeColor1 = (event: ChangeEvent<HTMLInputElement>) => {
    setColor1(parseInt(event.target.value));
  };
  const changeColor2 = (event: ChangeEvent<HTMLInputElement>) => {
    setColor2(parseInt(event.target.value));
  };
  const changeTotalSetupDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setTotalSetupDuration(parseInt(event.target.value));
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
                <TextField
                  value={endgameStartDuration}
                  onChange={changeEndgameStartDuration}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Start of End Game Duration
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
                  value={endGameStartHB as unknown as string}
                  label='Speed'
                  onChange={changeEndgameStartHB}
                >
                  <MenuItem value={15}>Slow</MenuItem>
                  <MenuItem value={25}>Medium</MenuItem>
                  <MenuItem value={35}>Fast</MenuItem>
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
                  value={endGameHB as unknown as string}
                  label='Speed'
                  onChange={changeEndgameHB}
                >
                  <MenuItem value={15}>Slow</MenuItem>
                  <MenuItem value={25}>Medium</MenuItem>
                  <MenuItem value={35}>Fast</MenuItem>
                </Select>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  End Game Heartbeat
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
                  value={countdownDuration}
                  onChange={changeCountdownDuration}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Countdown Duration
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
                  value={totalSetupDuration}
                  onChange={changeTotalSetupDuration}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Total Setup Duration
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
                  value={countdownStyle}
                  label='Style'
                  onChange={changeCountdownStyle}
                >
                  <MenuItem value={'style1'}>Countdown</MenuItem>
                  <MenuItem value={'style2'}>Race Light</MenuItem>
                </Select>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Countdown Style
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
                  value={matchOverStyle}
                  label='Style'
                  onChange={changeMatchOverStyle}
                >
                  <MenuItem value={'carbon'}>Carbon</MenuItem>
                  <MenuItem value={'full'}>Full Tower</MenuItem>
                </Select>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Match Over Style
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
                  value={matchOverLEDPattern}
                  onChange={changeMatchOverLEDPattern}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Match Over LED Pattern
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
              control={<TextField value={color1} onChange={changeColor1} />}
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Color 1
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
              control={<TextField value={color2} onChange={changeColor2} />}
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Color 2
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
