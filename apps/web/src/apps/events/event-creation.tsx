import { FC, useState } from 'react';
import { Typography } from '@mui/material';
import { Event } from '@toa-lib/models';
import { postEvent, setupEventBase } from 'src/api/use-event-data.js';
import { ViewReturn } from 'src/components/buttons/view-return.js';
import { EventForm } from 'src/components/forms/event-form.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useNavigate } from 'react-router-dom';

export const EventCreation: FC = () => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const onSubmit = async (event: Event) => {
    setLoading(true);
    try {
      await postEvent(event);
      await setupEventBase(event.eventKey);
      showSnackbar(`Event ${event.eventName} Created`);
      setLoading(false);
      navigate(`/${event.eventKey}`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar(`Error: ${error}`, error);
      setLoading(false);
    }
  };
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Creation</Typography>}
      padding
      showSettings
    >
      <>
        <ViewReturn title='Events' href='/' />
        <EventForm loading={loading} onSubmit={onSubmit} />
      </>
    </PaperLayout>
  );
};
