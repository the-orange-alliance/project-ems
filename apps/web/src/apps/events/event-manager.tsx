import { FC, useState } from 'react';
import { Typography } from '@mui/material';
import { Event } from '@toa-lib/models';
import { patchEvent, useCurrentEvent } from 'src/api/use-event-data.js';
import { ViewReturn } from 'src/components/buttons/view-return.js';
import { EventForm } from 'src/components/forms/event-form.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';

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
      title={`${initialEvent?.eventName} | Event Manager`}
      titleLink={`/${initialEvent?.eventKey}`}
      padding
      showSettings
    >
      <>
        <ViewReturn title='Home' href={`/${initialEvent?.eventKey}`} />
        <EventForm
          initialEvent={initialEvent}
          loading={loading}
          onSubmit={onSubmit}
        />
      </>
    </PaperLayout>
  );
};
