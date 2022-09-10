import { ChangeEvent, FC, useState, useEffect } from 'react';
import moment, { Moment } from 'moment';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import DrawerLayout from 'src/layouts/DrawerLayout';
import AppRoutes from 'src/AppRoutes';
import { patchEvent, postEvent, setupEventBase } from 'src/api/ApiProvider';
import { useRecoilState } from 'recoil';
import { eventAtom } from 'src/stores/Recoil';
import { setFlag, useFlags } from 'src/stores/AppFlags';

const EventApp: FC = () => {
  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const [flags] = useFlags();

  const [event, setEvent] = useRecoilState(eventAtom);

  useEffect(() => {
    if (!flags.createdEvent) {
      setEvent({
        ...event,
        seasonKey: '22',
        regionKey: 'FGC',
        eventKey: '22-FGC-CMP',
        startDate: startDate ? startDate.toISOString() : moment().toISOString(),
        endDate: endDate ? endDate.toISOString() : moment().toISOString()
      });
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.type === 'number') {
      setEvent({ ...event, [e.target.name]: parseInt(e.target.value) });
    } else {
      setEvent({ ...event, [e.target.name]: e.target.value });
    }
  };

  const handleStartChange = (newValue: Moment | null) => {
    setStartDate(newValue);
    setEvent({
      ...event,
      startDate: newValue ? newValue.toISOString() : moment().toISOString()
    });
  };

  const handleEndChange = (newValue: Moment | null) => {
    setEndDate(newValue);
    setEvent({
      ...event,
      startDate: newValue ? newValue.toISOString() : moment().toISOString()
    });
  };

  const setup = async (): Promise<void> => {
    try {
      await setupEventBase();
      await postEvent(event);
      await setFlag('createdEvent', true);
      // TODO - Insert a SnackBar via a SnackBar manager via recoil probably
    } catch (e) {
      console.log(e);
    }
  };

  const modify = async (): Promise<void> => {
    try {
      await patchEvent(event.eventKey, event);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <DrawerLayout containerWidth='md' routes={AppRoutes}>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Event Manager</Typography>
        </Box>
        <Divider />
        <Grid
          container
          spacing={3}
          sx={{ padding: (theme) => theme.spacing(2) }}
        >
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              name='eventName'
              label='Event Name'
              variant='standard'
              fullWidth
              value={event.eventName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name='venue'
              label='Venue'
              variant='standard'
              fullWidth
              value={event.venue}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name='city'
              label='City'
              variant='standard'
              fullWidth
              value={event.city}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name='stateProv'
              label='State/Province'
              variant='standard'
              fullWidth
              value={event.stateProv}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name='country'
              label='Country'
              variant='standard'
              fullWidth
              value={event.country}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DesktopDatePicker
              label='Start Date'
              inputFormat='MM/DD/YYYY'
              value={startDate}
              onChange={handleStartChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DesktopDatePicker
              label='End Date'
              inputFormat='MM/DD/YYYY'
              value={endDate}
              onChange={handleEndChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type='number'
              name='fieldCount'
              label='Field Count'
              variant='standard'
              fullWidth
              value={event.fieldCount}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
        <Divider />
        <Grid
          container
          spacing={3}
          sx={{
            paddingLeft: (theme) => theme.spacing(2),
            paddingBottom: (theme) => theme.spacing(2)
          }}
        >
          {!flags.createdEvent && (
            <Grid item xs={12} sx={{ marginTop: (theme) => theme.spacing(2) }}>
              <Button variant='contained' onClick={setup}>
                Create Event Database
              </Button>
            </Grid>
          )}
          {flags.createdEvent && (
            <Grid item xs={12} sx={{ marginTop: (theme) => theme.spacing(2) }}>
              <Button variant='contained' onClick={modify}>
                Modify Event
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>
    </DrawerLayout>
  );
};

export default EventApp;
