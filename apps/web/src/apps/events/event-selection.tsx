import { Typography } from 'antd';
import { Event, eventZod } from '@toa-lib/models';
import { FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, useEvents } from 'src/api/use-event-data.js';
import EventsTable from 'src/components/tables/events-table.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { useAtomValue } from 'jotai';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { mutate } from 'swr';
import { normalizeRemoteApiHost } from 'src/util/remote-api-host.js';
import { remoteClient } from 'src/api/http-clients.js';

export const EventSelection: FC = () => {
  const navigate = useNavigate();
  const createEvent = () => navigate('/create-event');
  const remoteUrl = useAtomValue(remoteApiUrlAtom);
  const { showSnackbar, showErrorSnackbar } = useSnackbar();

  const handleDownload = async () => {
    if (!remoteUrl?.trim()) {
      showErrorSnackbar(
        'Cannot download events.',
        new Error('Set a Remote API URL in Settings → Global first.')
      );
      return;
    }
    try {
      remoteClient.setBaseUrl(normalizeRemoteApiHost(remoteUrl));
      const events =
        (await remoteClient.get<Event[]>('/event', {
          schema: eventZod.array()
        })) ?? [];
      await Promise.all(
        events.map(async (event) => {
          await eventsApi.create.event(event);
          await eventsApi.setup.get.eventBase(event.eventKey);
        })
      );
      mutate('/event', events);
      showSnackbar(`(${events.length}) Events successfully downloaded`);
    } catch (e) {
      showErrorSnackbar('Error while downloading events.', e);
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
                  label: <a onClick={handleDownload}>Download Events</a>
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
