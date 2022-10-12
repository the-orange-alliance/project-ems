import { FC, useEffect, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import DefaultLayout from 'src/layouts/DefaultLayout';
import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  ListItemText,
  OutlinedInput,
  Switch
} from '@mui/material';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  darkModeAtom,
  fieldMotorDuration,
  fieldEndgameHB,
  fieldCountdownStyle,
  fieldCountdownDuration,
  fieldMatchOverStyle,
  fieldMatchOverLEDPattern,
  fieldColor1,
  fieldColor2,
  fieldTotalSetupDuration,
  fieldMotorReverseDuration,
  hostIP,
  fieldControl,
  eventFields,
  followerMode,
  displayChromaKey
} from 'src/stores/Recoil';
import MenuItem from '@mui/material/MenuItem';
import useLocalStorage from 'src/stores/LocalStorage';
import { defaultFieldOptions, FieldOptions } from '@toa-lib/models';
import { APIOptions } from '@toa-lib/client';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [motorDuration, setMotorDuration] = useRecoilState(fieldMotorDuration);
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
  const [totalSetupDuration, setTotalSetupDuration] = useRecoilState(
    fieldTotalSetupDuration
  );
  const [motorReverseDuration, setMotorReverseDuration] = useRecoilState(
    fieldMotorReverseDuration
  );
  const [host, setHost] = useRecoilState(hostIP);
  const [fields, setFields] = useRecoilState(fieldControl);
  const allFields = useRecoilValue(eventFields);
  const [follower, setFollower] = useRecoilState(followerMode);

  const [, setOptions] = useLocalStorage<FieldOptions>(
    'ems:fcs:options',
    defaultFieldOptions
  );
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKey);

  const [, setStorageHost] = useLocalStorage<string>('ems:host', host);
  const [, setStorageFields] = useLocalStorage<number[]>('ems:fields', fields);
  const [, setStorageMode] = useLocalStorage<boolean>('ems:mode', follower);
  const [, setStorageChroma] = useLocalStorage<string>(
    'ems:aud:chroma',
    chromaKey
  );

  useEffect(() => {
    setOptions({
      motorDuration,
      endGameHB,
      countdownStyle,
      countdownDuration,
      matchEndStyle: matchOverStyle,
      matchEndPattern: matchOverLEDPattern,
      primaryColor: color1,
      secondaryColor: color2,
      setupDuration: totalSetupDuration,
      motorReverseDuration: motorReverseDuration
    });
  }, [
    motorDuration,
    endGameHB,
    countdownStyle,
    countdownDuration,
    matchOverStyle,
    matchOverLEDPattern,
    color1,
    color2,
    totalSetupDuration,
    motorReverseDuration
  ]);

  useEffect(() => {
    setStorageHost(host);
    // Update API
    APIOptions.host = `http://${host}`;
  }, [host]);

  useEffect(() => {
    setStorageFields(fields);
  }, [fields]);

  useEffect(() => {
    setStorageMode(follower);
  }, [follower]);

  useEffect(() => {
    setStorageChroma(chromaKey);
  }, [chromaKey]);

  const changeDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  const changeMotorDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setMotorDuration(parseInt(event.target.value));
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
  const changeMotorReversDuration = (event: ChangeEvent<HTMLInputElement>) => {
    setMotorReverseDuration(parseInt(event.target.value));
  };
  const changeHost = (event: ChangeEvent<HTMLInputElement>) => {
    setHost(event.target.value);
  };
  const changeFields = (event: SelectChangeEvent<number[]>) => {
    const {
      target: { value }
    } = event;
    setFields(typeof value === 'string' ? [] : value);
  };
  const changeFollowerMode = () => {
    setFollower((prev: boolean) => !prev);
  };
  const changeChromaKey = (event: ChangeEvent<HTMLInputElement>) => {
    setChromaKey(event.target.value);
  };

  return (
    <DefaultLayout containerWidth='md'>
      <Paper sx={{ marginBottom: (theme) => theme.spacing(8) }}>
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
                  value={motorReverseDuration}
                  onChange={changeMotorReversDuration}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Field Reset Motor Duration
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
          <FormGroup
            sx={{
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover
              }
            }}
          >
            <FormControlLabel
              control={
                <TextField value={chromaKey} onChange={changeChromaKey} />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Audience Display Chroma
                </Typography>
              }
              labelPlacement='start'
              sx={{ padding: (theme) => theme.spacing(2) }}
            />
          </FormGroup>
          <Divider />
          <FormGroup
            sx={{
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover
              }
            }}
          >
            <FormControlLabel
              control={
                <Switch value={follower} onChange={changeFollowerMode} />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Follower Mode
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
                  value={host}
                  onChange={changeHost}
                  disabled={!follower}
                />
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  API Host (For multi-field setups)
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
                  labelId='demo-multiple-checkbox-label'
                  id='demo-multiple-checkbox'
                  multiple
                  value={fields}
                  onChange={changeFields}
                  input={<OutlinedInput label='Tag' />}
                  renderValue={(selected) => selected.join(', ')}
                  disabled={!follower}
                >
                  {allFields.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={fields.indexOf(field) > -1} />
                      <ListItemText primary={`Field ${field}`} />
                    </MenuItem>
                  ))}
                </Select>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Field Control
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
                <Button variant='contained' color='error' disabled={!follower}>
                  Update Network Settings
                </Button>
              }
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }} />
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
