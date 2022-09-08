import { ChangeEvent, FC, useEffect, useState } from 'react';
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
import { postEvent, setupEventBase, useEvent } from 'src/api/ApiProvider';
import { Event, defaultEvent } from '@toa-lib/models';

const EventApp: FC = () => {
  const [event, setEvent] = useState<Event>(defaultEvent);
  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const { data, error } = useEvent();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEvent({ ...event, [e.target.name]: e.target.value });
  };

  const handleStartChange = (newValue: Moment | null) => setStartDate(newValue);
  const handleEndChange = (newValue: Moment | null) => setEndDate(newValue);

  useEffect(() => {
    if (data) {
      setEvent(data);
      setStartDate(moment(event.startDate));
      setEndDate(moment(event.endDate));
    }
  }, [data]);

  const setup = async (): Promise<void> => {
    try {
      event.seasonKey = '22';
      event.regionKey = 'FGC';
      event.eventKey = '22-FGC-CMP';
      event.startDate = startDate
        ? startDate.toISOString()
        : moment().toISOString();
      event.endDate = endDate ? endDate.toISOString() : moment().toISOString();
      event.fieldCount = parseInt(`${event.fieldCount}`);
      await setupEventBase();
      await postEvent(event);
      // TODO - Insert a SnackBar via a SnackBar manager via recoil probably
    } catch (e) {
      console.log(e);
    }
  };

  const modify = async (): Promise<void> => {
    console.log(event);
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
          {(!data || error) && (
            <Grid item xs={12} sx={{ marginTop: (theme) => theme.spacing(2) }}>
              <Button variant='contained' onClick={setup}>
                Create Event Database
              </Button>
            </Grid>
          )}
          {data && !error && (
            <Grid item xs={12} sx={{ marginTop: (theme) => theme.spacing(2) }}>
              <Button
                variant='contained'
                disabled={event === data}
                onClick={modify}
              >
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
