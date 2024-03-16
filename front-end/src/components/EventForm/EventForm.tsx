import { ChangeEvent, FC, useState } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import LoadingButton from '@mui/lab/LoadingButton';
import ViewReturn from '@components/ViewReturn/ViewReturn';
import SeasonDropdown from '@components/Dropdowns/SeasonDropdown';
import EventTypeDropdown from '@components/Dropdowns/EventTypeDropdown';
import DatePicker from '@components/DatePicker/DatePicker';
import { patchEvent, postEvent, setupEventBase } from 'src/api/ApiProvider';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { useFlags } from '@stores/AppFlags';
import { Event } from '@toa-lib/models';
import { Button, Link } from '@mui/material';

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

interface Props {
  event: Event | null;
  onChange: (event: Event) => void;
  onSubmit?: (event: Event) => void;
  onCancel?: () => void;
}

const EventForm: FC<Props> = ({ event, onChange, onSubmit, onCancel }) => {
  // Local State
  const [loading, setLoading] = useState(false);

  // Custom Hooks
  const { showSnackbar } = useSnackbar();
  const [flags, setFlags] = useFlags();

  // Local variables
  const createdEvent = flags.createdEvents.includes(event?.eventKey ?? '');

  if (!event) return null;

  // TODO: Input Validation
  const createEvent = async () => {
    try {
      setLoading(true);
      await postEvent(event);
      await setupEventBase(event.eventKey);
      await setFlags('createdEvents', [...flags.createdEvents, event.eventKey]);
      setLoading(false);
      showSnackbar('Event successfully created');
      onSubmit?.(event);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Erorr while creating event.', error);
    }
  };

  const modifyEvent = async () => {
    try {
      setLoading(true);
      await patchEvent(event.eventKey, event);
      setLoading(false);
      showSnackbar('Event successfully modified');
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while modifying event.', error);
    }
  };

  const onReturn = () => onCancel?.();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    onChange({
      ...event,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleSeasonChange = (seasonKey: string) => {
    onChange({
      ...event,
      seasonKey,
      eventKey: `${seasonKey}-${event.regionKey}-`.toUpperCase()
    });
  };

  const handleRegionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onChange({
      ...event,
      regionKey: value.toUpperCase(),
      eventKey: `${event.seasonKey}-${value}-`.toUpperCase()
    });
  };

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onChange({ ...event, eventKey: value.toUpperCase() });
  };

  const handleEventTypeChange = (eventTypeKey: string) => {
    onChange({ ...event, eventTypeKey });
  };

  const handleStartChange = (startDate: string) => {
    onChange({ ...event, startDate });
  };

  const handleEndChange = (endDate: string) => {
    onChange({ ...event, endDate });
  };

  return (
    <div>
      {onSubmit && <ViewReturn title='Events' onClick={onReturn} />}
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
            sx={{ float: 'right' }}
          >
            {createdEvent ? 'Modify Event' : 'Create Event'}
          </LoadingButton>
          {createdEvent && (
            <Link href={`/${event.eventKey}`}>
              <Button
                variant='contained'
                onClick={onCancel}
                sx={{ float: 'right', mr: 1 }}
              >
                Cancel
              </Button>
            </Link>
          )}
        </Grid>
      </Grid>
    </div>
  );
};

export default EventForm;
