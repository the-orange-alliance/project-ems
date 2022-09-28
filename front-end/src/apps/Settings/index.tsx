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
  fieldCountdownDuration, fieldMatchOverStyle, fieldMatchOverLEDPattern, fieldColor1, fieldColor2
} from 'src/stores/Recoil';
import MenuItem from '@mui/material/MenuItem';
import {
  LED_COLOR_AQUA,
  LED_COLOR_BLACK,
  LED_COLOR_BLUE,
  LED_COLOR_BLUE_GREEN,
  LED_COLOR_BLUE_VIOLET,
  LED_COLOR_DARK_BLUE, LED_COLOR_DARK_GRAY,
  LED_COLOR_DARK_GREEN,
  LED_COLOR_DARK_RED,
  LED_COLOR_GOLD, LED_COLOR_GRAY,
  LED_COLOR_GREEN,
  LED_COLOR_LAWN_GREEN,
  LED_COLOR_LIME,
  LED_COLOR_ORANGE,
  LED_COLOR_PINK,
  LED_COLOR_RED,
  LED_COLOR_RED_ORANGE,
  LED_COLOR_SKY_BLUE, LED_COLOR_VIOLET, LED_COLOR_WHITE,
  LED_COLOR_YELLOW
} from "@toa-lib/models";

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
  const changeMatchOverLEDPattern = (event: SelectChangeEvent) => {
    setMatchOverLEDPattern(parseInt(event.target.value));
  };
  const changeColor1 = (event: SelectChangeEvent) => {
    setColor1(parseInt(event.target.value));
  };
  const changeColor2 = (event: SelectChangeEvent) => {
    setColor2(parseInt(event.target.value));
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
                <Select
                  value={matchOverLEDPattern as unknown as string}
                  label='Style'
                  onChange={changeMatchOverLEDPattern}
                >
                  <MenuItem value={1}>Carbon</MenuItem>
                  <MenuItem value={LED_COLOR_YELLOW}>Yellow</MenuItem>
                  <MenuItem value={LED_COLOR_BLACK}>Black</MenuItem>
                  <MenuItem value={LED_COLOR_PINK}>Pink</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_RED}>Dark Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED}>Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED_ORANGE}>Red Orange</MenuItem>
                  <MenuItem value={LED_COLOR_ORANGE}>Orange</MenuItem>
                  <MenuItem value={LED_COLOR_GOLD}>Gold</MenuItem>
                  <MenuItem value={LED_COLOR_LAWN_GREEN}>Lawn Green</MenuItem>
                  <MenuItem value={LED_COLOR_LIME}>Lime</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GREEN}>Dark Green</MenuItem>
                  <MenuItem value={LED_COLOR_GREEN}>Green</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_GREEN}>Blue Green</MenuItem>
                  <MenuItem value={LED_COLOR_AQUA}>Aqua</MenuItem>
                  <MenuItem value={LED_COLOR_SKY_BLUE}>Sky Blue</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_BLUE}>Dark Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE}>Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_VIOLET}>Blue Violet</MenuItem>
                  <MenuItem value={LED_COLOR_VIOLET}>Violet</MenuItem>
                  <MenuItem value={LED_COLOR_WHITE}>White</MenuItem>
                  <MenuItem value={LED_COLOR_GRAY}>Gray</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GRAY}>Dark Gray</MenuItem>
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
                <Select
                  value={color1 as unknown as string}
                  label='Style'
                  onChange={changeColor1}
                >
                  <MenuItem value={1}>Carbon</MenuItem>
                  <MenuItem value={LED_COLOR_YELLOW}>Yellow</MenuItem>
                  <MenuItem value={LED_COLOR_BLACK}>Black</MenuItem>
                  <MenuItem value={LED_COLOR_PINK}>Pink</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_RED}>Dark Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED}>Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED_ORANGE}>Red Orange</MenuItem>
                  <MenuItem value={LED_COLOR_ORANGE}>Orange</MenuItem>
                  <MenuItem value={LED_COLOR_GOLD}>Gold</MenuItem>
                  <MenuItem value={LED_COLOR_LAWN_GREEN}>Lawn Green</MenuItem>
                  <MenuItem value={LED_COLOR_LIME}>Lime</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GREEN}>Dark Green</MenuItem>
                  <MenuItem value={LED_COLOR_GREEN}>Green</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_GREEN}>Blue Green</MenuItem>
                  <MenuItem value={LED_COLOR_AQUA}>Aqua</MenuItem>
                  <MenuItem value={LED_COLOR_SKY_BLUE}>Sky Blue</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_BLUE}>Dark Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE}>Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_VIOLET}>Blue Violet</MenuItem>
                  <MenuItem value={LED_COLOR_VIOLET}>Violet</MenuItem>
                  <MenuItem value={LED_COLOR_WHITE}>White</MenuItem>
                  <MenuItem value={LED_COLOR_GRAY}>Gray</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GRAY}>Dark Gray</MenuItem>
                </Select>
              }
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
              control={
                <Select
                  value={color2 as unknown as string}
                  label='Style'
                  onChange={changeColor2}
                >
                  <MenuItem value={LED_COLOR_YELLOW}>Yellow</MenuItem>
                  <MenuItem value={LED_COLOR_BLACK}>Black</MenuItem>
                  <MenuItem value={LED_COLOR_PINK}>Pink</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_RED}>Dark Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED}>Red</MenuItem>
                  <MenuItem value={LED_COLOR_RED_ORANGE}>Red Orange</MenuItem>
                  <MenuItem value={LED_COLOR_ORANGE}>Orange</MenuItem>
                  <MenuItem value={LED_COLOR_GOLD}>Gold</MenuItem>
                  <MenuItem value={LED_COLOR_LAWN_GREEN}>Lawn Green</MenuItem>
                  <MenuItem value={LED_COLOR_LIME}>Lime</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GREEN}>Dark Green</MenuItem>
                  <MenuItem value={LED_COLOR_GREEN}>Green</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_GREEN}>Blue Green</MenuItem>
                  <MenuItem value={LED_COLOR_AQUA}>Aqua</MenuItem>
                  <MenuItem value={LED_COLOR_SKY_BLUE}>Sky Blue</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_BLUE}>Dark Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE}>Blue</MenuItem>
                  <MenuItem value={LED_COLOR_BLUE_VIOLET}>Blue Violet</MenuItem>
                  <MenuItem value={LED_COLOR_VIOLET}>Violet</MenuItem>
                  <MenuItem value={LED_COLOR_WHITE}>White</MenuItem>
                  <MenuItem value={LED_COLOR_GRAY}>Gray</MenuItem>
                  <MenuItem value={LED_COLOR_DARK_GRAY}>Dark Gray</MenuItem>
                </Select>
              }
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
