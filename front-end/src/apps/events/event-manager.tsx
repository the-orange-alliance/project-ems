import { FC, useState } from 'react';
import { Typography } from '@mui/material';
import { Event } from '@toa-lib/models';
import { patchEvent, useCurrentEvent } from 'src/api/use-event-data';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import { EventForm } from 'src/components/forms/event-form';
import { useSnackbar } from 'src/hooks/use-snackbar';
import PaperLayout from 'src/layouts/PaperLayout';

export const EventManager: FC = () => {
  const { data: initialEvent, mutate } = useCurrentEvent();
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const onSubmit = async (event: Event) => {
    setLoading(true);
    try {
      await patchEvent(event.eventKey, event);
      mutate(event);
      showSnackbar(`Event ${event.eventName} Modified`);
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar(`Error: ${error}`, error);
      setLoading(false);
    }
  };
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Manager</Typography>}
      padding
      showSettings
    >
      <ViewReturn title='Events' href={`/${initialEvent?.eventKey}`} />
      <EventForm
        initialEvent={initialEvent}
        loading={loading}
        onSubmit={onSubmit}
      />
    </PaperLayout>
  );
};
