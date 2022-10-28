import { FC } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { eventsAtom, currentEventAtom } from 'src/stores/NewRecoil';
import { defaultEvent, Event, EventTypes } from '@toa-lib/models';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';
import { DateTime } from 'luxon';

const Events: FC = () => {
  const events = useRecoilValue(eventsAtom);
  const [event, setEvent] = useRecoilState(currentEventAtom);

  const createEvent = () => {
    setEvent(defaultEvent);
  };

  const selectEvent = (e: Event) => setEvent(e);

  if (event) return null;

  return (
    <>
      <Box sx={{ display: 'flex', marginBottom: (theme) => theme.spacing(3) }}>
        {events.length <= 0 && (
          <Typography>
            There are currently no events in the database. Please consider
            creating an event.
          </Typography>
        )}
        <Button
          variant='contained'
          onClick={createEvent}
          sx={{ marginLeft: 'auto' }}
        >
          Create Event
        </Button>
      </Box>
      {events.length > 0 && (
        <UpgradedTable
          data={events}
          headers={['Key', 'Name', 'Type', 'Location', 'Date', 'Website']}
          renderRow={(e) => {
            const eventType = EventTypes.find(
              (t) => t.key === e.eventTypeKey
            )?.name;
            const location = [e.city, e.stateProv, e.country]
              .filter((str) => str.length > 0)
              .toString();
            const startDate = DateTime.fromISO(e.startDate);
            const endDate = DateTime.fromISO(e.endDate);
            return [
              e.eventKey,
              e.eventName,
              eventType ?? '',
              `${e.venue} - ${location}`,
              `${startDate.toFormat('EEE, MMM d, y')} - ${endDate.toFormat(
                'EEE, MMM d, y'
              )}`,
              e.website
            ];
          }}
          onSelect={selectEvent}
        />
      )}
    </>
  );
};

export default Events;
