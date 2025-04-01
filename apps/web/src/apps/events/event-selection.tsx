import { Typography } from 'antd';
import { Event } from '@toa-lib/models';
import { FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from 'src/api/use-event-data.js';
import EventsTable from 'src/components/tables/events-table.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { MoreButton } from 'src/components/buttons/more-button.js';

export const EventSelection: FC = () => {
  const navigate = useNavigate();
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
      <Suspense>
        <App />
      </Suspense>
    </PaperLayout>
  );
};

const App: FC = () => {
  const navigate = useNavigate();
  const { data: events, isLoading } = useEvents();
  const selectEvent = (event: Event) => navigate(`/${event.eventKey}`);
  return (
    <EventsTable
      events={events ?? []}
      onSelect={selectEvent}
      loading={isLoading}
    />
  );
};
