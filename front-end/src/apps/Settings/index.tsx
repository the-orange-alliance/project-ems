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
  hostIP,
  fieldControl,
  eventFields,
  followerMode,
  displayChromaKey,
  darkModeAtom
} from 'src/stores/Recoil';
import MenuItem from '@mui/material/MenuItem';
import useLocalStorage from 'src/stores/LocalStorage';
import { defaultFieldOptions, FieldOptions } from '@toa-lib/models';
import { APIOptions, clientFetcher } from '@toa-lib/client';

const SettingsApp: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
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
  const forceResultsSync = () => {
    clientFetcher('results/sync/matches', 'POST');
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
              onClick={forceResultsSync}
              control={<Button variant='contained'>Force Sync</Button>}
              label={
                <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
                  Results Site
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
