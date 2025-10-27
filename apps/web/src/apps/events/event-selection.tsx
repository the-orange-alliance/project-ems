import { Typography } from 'antd';
import { Event } from '@toa-lib/models';
import { FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getEvents,
  postEvent,
  setupEventBase,
  useEvents
} from 'src/api/use-event-data.js';
import EventsTable from 'src/components/tables/events-table.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { APIOptions } from '@toa-lib/client';
import { useAtomValue } from 'jotai';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { mutate } from 'swr';

export const EventSelection: FC = () => {
  const navigate = useNavigate();
  const createEvent = () => navigate('/create-event');
  const remoteUrl = useAtomValue(remoteApiUrlAtom);
  const { showSnackbar } = useSnackbar();

  const handleDownload = async () => {
    try {
      const previousUrl = APIOptions.host;
      APIOptions.host = remoteUrl;
      const events = await getEvents();
      APIOptions.host = previousUrl;
      await Promise.all(
        events.map(async (event) => {
          await postEvent(event);
          await setupEventBase(event.eventKey);
        })
      );
      mutate('event', events);
      showSnackbar(`(${events.length}) Events successfully downloaded`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while downloading events.', error);
    }
  };

  return (
    <PaperLayout
      containerWidth='lg'
      header={
        <TwoColumnHeader
          left={
            <Typography.Title level={3} style={{ marginTop: '0.5em' }}>
              Event Selection
            </Typography.Title>
          }
          right={
            <MoreButton
              menuItems={[
                { key: '1', label: <a onClick={createEvent}>Create Event</a> },
                {
                  key: '2',
                  label: <a onClick={handleDownload}>Download Evets</a>
                }
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
