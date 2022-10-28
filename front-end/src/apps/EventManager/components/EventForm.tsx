import { ChangeEvent, FC, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import LoadingButton from '@mui/lab/LoadingButton';
import ViewReturn from 'src/components/ViewReturn/ViewReturn';
import { currentEventAtom, eventsAtom } from 'src/stores/NewRecoil';
import SeasonDropdown from 'src/components/Dropdowns/SeasonDropdown';
import EventTypeDropdown from 'src/components/Dropdowns/EventTypeDropdown';
import DatePicker from 'src/components/DatePicker/DatePicker';
import { patchEvent, postEvent, setupEventBase } from 'src/api/ApiProvider';
import { useSnackbar } from 'src/features/hooks/use-snackbar';
import { useFlags } from 'src/stores/AppFlags';

const FormField: FC<{
  name: string;
  label: string;
  value: string | number;
  type?: string;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, type, disabled, onChange }) => {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <FormControl fullWidth>
        <TextField
          name={name}
          label={label}
          value={value}
          onChange={onChange}
          variant='standard'
          type={type ?? 'text'}
          disabled={disabled}
        />
      </FormControl>
    </Grid>
  );
};

const EventForm: FC = () => {
  // Global State
  const setEvents = useSetRecoilState(eventsAtom);
  const [event, setEvent] = useRecoilState(currentEventAtom);

  // Local State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Custom Hooks
  const { showSnackbar } = useSnackbar();
  const [flags, setFlags] = useFlags();

  // Local variables
  const createdEvent = flags.createdEvents.includes(event?.eventKey ?? '');

  if (!event) return null;

  const createEvent = async () => {
    try {
      setLoading(true);
      await setupEventBase(event.seasonKey);
      await postEvent(event);
      await setFlags('createdEvents', [...flags.createdEvents, event.eventKey]);
      setEvents((prev) => [...prev, event]);
      setLoading(false);
      setError('');
      showSnackbar('Event successfully created');
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? `${e.name} ${e.message}` : String(e));
    }
  };

  const modifyEvent = async () => {
    try {
      setLoading(true);
      await patchEvent(event.eventKey, event);
      setLoading(false);
      setError('');
      showSnackbar('Event successfully modified');
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? `${e.name} ${e.message}` : String(e));
    }
  };

  const onReturn = () => setEvent(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    setEvent({
      ...event,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleSeasonChange = (seasonKey: string) => {
    setEvent({
      ...event,
      seasonKey,
      eventKey: `${seasonKey}-${event.regionKey}-`.toUpperCase()
    });
  };

  const handleRegionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setEvent({
      ...event,
      regionKey: value.toUpperCase(),
      eventKey: `${event.seasonKey}-${value}-`.toUpperCase()
    });
  };

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setEvent({ ...event, eventKey: value.toUpperCase() });
  };

  const handleEventTypeChange = (eventTypeKey: string) => {
    setEvent({ ...event, eventTypeKey });
  };

  const handleStartChange = (startDate: string) => {
    setEvent({ ...event, startDate });
  };

  const handleEndChange = (endDate: string) => {
    setEvent({ ...event, endDate });
  };

  return (
    <div>
      <ViewReturn title='Events' onClick={onReturn} />
      <Grid container spacing={3}>
        <FormField
          name='eventName'
          label='Event Name'
          value={event.eventName}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6} md={4}>
          <SeasonDropdown
            value={event.seasonKey}
            onChange={handleSeasonChange}
            disabled={createdEvent}
          />
        </Grid>
        <FormField
          name='regionKey'
          label='Region'
          value={event.regionKey}
          onChange={handleRegionChange}
          disabled={createdEvent}
        />
        <FormField
          name='eventKey'
          label='Event Key'
          value={event.eventKey}
          onChange={handleKeyChange}
          disabled={createdEvent}
        />
        <FormField
          name='divisionName'
          label='Division Name'
          value={event.divisionName}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6} md={4}>
          <EventTypeDropdown
            value={event.eventTypeKey}
            onChange={handleEventTypeChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DatePicker
            label='Start Date'
            value={event.startDate}
            onChange={handleStartChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DatePicker
            label='End Date'
            value={event.endDate}
            onChange={handleEndChange}
          />
        </Grid>
        <FormField
          name='venue'
          label='Venue'
          value={event.venue}
          onChange={handleChange}
        />
        <FormField
          name='city'
          label='City'
          value={event.city}
          onChange={handleChange}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={event.stateProv}
          onChange={handleChange}
        />
        <FormField
          name='country'
          label='Country'
          value={event.country}
          onChange={handleChange}
        />
        <Grid item xs={12}>
          <LoadingButton
            loading={loading}
            variant='contained'
            onClick={createdEvent ? modifyEvent : createEvent}
          >
            {createdEvent ? 'Modify Event' : 'Create Event'}
          </LoadingButton>
        </Grid>
        {error.length > 0 && (
          <Grid item xs={12}>
            <Typography color='error'>{error}</Typography>
          </Grid>
        )}
      </Grid>
    </div>
  );
};

export default EventForm;
