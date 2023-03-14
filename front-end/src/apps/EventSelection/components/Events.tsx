import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { eventsAtom } from 'src/stores/NewRecoil';
import { Event, EventTypes } from '@toa-lib/models';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';
import { DateTime } from 'luxon';
import { useNavigate } from 'react-router-dom';
import { Fab, Tooltip } from '@mui/material';
import Add from '@mui/icons-material/Add';

interface Props {
  onCreateDefault: () => void;
}

const Events: FC<Props> = ({ onCreateDefault }) => {
  const events = useRecoilValue(eventsAtom);

  const navigate = useNavigate();

  const createEvent = () => onCreateDefault();

  const selectEvent = (e: Event) => {
    navigate(`/${e.eventKey}`);
  };

  return (
    <>
      <Box sx={{ display: 'flex', marginBottom: (theme) => theme.spacing(3) }}>
        {events.length <= 0 && (
          <Typography>
            There are currently no events in the database. Please consider
            creating an event.
          </Typography>
        )}
        <Tooltip title="Create Event">
          <Fab
            sx={{ position: 'absolute', bottom: 16, right: 16 }}
            onClick={createEvent}
            color="primary"
          >
            <Add />
          </Fab>
        </Tooltip>
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
