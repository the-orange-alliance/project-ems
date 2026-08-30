import { FC, useState } from 'react';
import { Typography } from 'antd';
import { Event } from '@toa-lib/models';
import { eventsApi, useCurrentEvent } from 'src/api/use-event-data.js';
import { EventForm } from 'src/components/forms/event-form.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';

export const EventManager: FC = () => {
  const { data: initialEvent, mutate } = useCurrentEvent();
  const [loading, setLoading] = useState(false);
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const onSubmit = async (event: Event) => {
    setLoading(true);
    try {
      await eventsApi.update.event(event.eventKey, event);
      mutate(event);
      showSnackbar(`Event ${event.eventName} Modified`);
      setLoading(false);
    } catch (e) {
      showErrorSnackbar('Error while updating event.', e);
      setLoading(false);
    }
  };
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography.Title level={3}>Event Creation</Typography.Title>}
      title={`${initialEvent?.eventName} | Event Manager`}
      titleLink={`/${initialEvent?.eventKey}`}
      showSettings
    >
      <EventForm
        initialEvent={initialEvent}
        loading={loading}
        onSubmit={onSubmit}
        returnTo={`/${initialEvent?.eventKey}`}
      />
    </PaperLayout>
  );
};
