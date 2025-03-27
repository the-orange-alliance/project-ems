import { ChangeEvent, FC, useEffect, useState } from 'react';
import { Grid, TextField, FormControl } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { SeasonDropdown } from 'src/components/dropdowns/season-dropdown.js';
import { EventTypeDropdown } from 'src/components/dropdowns/event-type-dropdown.js';
import { DatePicker } from 'src/components/util/date-picker.js';
import { Event, defaultEvent } from '@toa-lib/models';

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
  initialEvent?: Event | null;
  onSubmit?: (event: Event) => void;
  loading?: boolean;
}

export const EventForm: FC<Props> = ({ initialEvent, onSubmit, loading }) => {
  const [event, setEvent] = useState({ ...(initialEvent ?? defaultEvent) });

  useEffect(() => {
    if (initialEvent) setEvent(initialEvent);
  }, [initialEvent]);

  const handleSubmit = () => {
    if (!event) return;
    onSubmit?.(event);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!event) return;
    const { type, name, value } = e.target;
    setEvent({
      ...event,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleSeasonChange = (seasonKey: string) => {
    if (!event) return;
    setEvent({
      ...event,
      seasonKey,
      eventKey: `${seasonKey}-${event.regionKey}-`.toUpperCase()
    });
  };

  const handleRegionChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!event) return;
    const { value } = e.target;
    setEvent({
      ...event,
      regionKey: value.toUpperCase(),
      eventKey: `${event.seasonKey}-${value}-`.toUpperCase()
    });
  };

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!event) return;
    const { value } = e.target;
    setEvent({ ...event, eventKey: value.toUpperCase() });
  };

  const handleEventTypeChange = (eventTypeKey: string) => {
    if (!event) return;
    setEvent({ ...event, eventTypeKey });
  };

  const handleStartChange = (startDate: string) => {
    if (!event) return;
    setEvent({ ...event, startDate });
  };

  const handleEndChange = (endDate: string) => {
    if (!event) return;
    setEvent({ ...event, endDate });
  };

  return (
    <div>
      <Grid container spacing={3}>
        <FormField
          name='eventName'
          label='Event Name'
          value={event.eventName}
          onChange={handleChange}
          disabled={loading}
        />
        <Grid item xs={12} sm={6} md={4}>
          <SeasonDropdown
            value={event.seasonKey}
            onChange={handleSeasonChange}
            disabled={typeof initialEvent !== 'undefined' || loading}
          />
        </Grid>
        <FormField
          name='regionKey'
          label='Region'
          value={event.regionKey}
          onChange={handleRegionChange}
          disabled={typeof initialEvent !== 'undefined' || loading}
        />
        <FormField
          name='eventKey'
          label='Event Key'
          value={event.eventKey}
          onChange={handleKeyChange}
          disabled={typeof initialEvent !== 'undefined' || loading}
        />
        <FormField
          name='divisionName'
          label='Division Name'
          value={event.divisionName}
          onChange={handleChange}
          disabled={loading}
        />
        <Grid item xs={12} sm={6} md={4}>
          <EventTypeDropdown
            value={event.eventTypeKey}
            onChange={handleEventTypeChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DatePicker
            label='Start Date'
            value={event.startDate}
            onChange={handleStartChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DatePicker
            label='End Date'
            value={event.endDate}
            onChange={handleEndChange}
            disabled={loading}
          />
        </Grid>
        <FormField
          name='venue'
          label='Venue'
          value={event.venue}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='city'
          label='City'
          value={event.city}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={event.stateProv}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='country'
          label='Country'
          value={event.country}
          onChange={handleChange}
          disabled={loading}
        />
        <Grid item xs={12}>
          <LoadingButton
            loading={loading}
            variant='contained'
            onClick={handleSubmit}
            sx={{ float: 'right' }}
            disabled={loading}
          >
            {initialEvent ? 'Modify Event' : 'Create Event'}
          </LoadingButton>
        </Grid>
      </Grid>
    </div>
  );
};
