import { Typography } from 'antd';
import { Event } from '@toa-lib/models';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from 'src/api/use-event-data.js';
import EventsTable from 'src/components/tables/events-table.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { MoreButton } from 'src/components/buttons/more-button.js';

export const EventSelection: FC = () => {
  const { data: events, isLoading } = useEvents();
  const navigate = useNavigate();
  const selectEvent = (event: Event) => navigate(`/${event.eventKey}`);
  const createEvent = () => navigate('/create-event');
  return (
    <PaperLayout
      containerWidth='lg'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Event Selection</Typography.Title>}
          right={
            <MoreButton
              menuItems={[
                { key: '1', label: <a onClick={createEvent}>Create Event</a> }
              ]}
            />
          }
        />
      }
      showSettings
    >
      <>
        <EventsTable
          events={events ?? []}
          onSelect={selectEvent}
          loading={isLoading}
        />
      </>
    </PaperLayout>
  );
};
