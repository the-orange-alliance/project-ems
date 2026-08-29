import { FC, useState } from 'react';
import { Typography } from 'antd';
import { Event } from '@toa-lib/models';
import { eventsApi } from 'src/api/use-event-data.js';
import { EventForm } from 'src/components/forms/event-form.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useNavigate } from 'react-router-dom';

export const EventCreation: FC = () => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const onSubmit = async (event: Event) => {
    setLoading(true);
    try {
      await eventsApi.create.event(event);
      await eventsApi.setup.get.eventBase(event.eventKey);
      showSnackbar(`Event ${event.eventName} Created`);
      setLoading(false);
      navigate(`/${event.eventKey}`);
    } catch (e) {
      showErrorSnackbar('Error while creating event.', e);
      setLoading(false);
    }
  };
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography.Title level={3}>Event Creation</Typography.Title>}
      showSettings
    >
      <EventForm loading={loading} onSubmit={onSubmit} returnTo='/' />
    </PaperLayout>
  );
};
