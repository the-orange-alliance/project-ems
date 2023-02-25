import { FC, useState } from 'react';
import PaperLayout from '@layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Events from './components/Events';
import EventForm from '@features/components/EventForm/EventForm';
import { defaultEvent } from '@toa-lib/models';
import { useSetRecoilState } from 'recoil';
import { eventsAtom } from '@stores/NewRecoil';
import { useNavigate } from 'react-router-dom';

const EventSelection: FC = () => {
  const [newEvent, setNewEvent] = useState({ ...defaultEvent });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const setEvents = useSetRecoilState(eventsAtom);

  const navigate = useNavigate();

  const handleCreateDefault = () => {
    setNewEvent({ ...defaultEvent });
    setCreatingEvent(true);
  };

  const handleSubmitEvent = () => {
    setEvents((prev) => [...prev, newEvent]);
    navigate(`/${newEvent.eventKey}`);
  };

  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Selection</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        {!creatingEvent && <Events onCreateDefault={handleCreateDefault} />}
        {creatingEvent && (
          <EventForm
            event={newEvent}
            onChange={setNewEvent}
            onSubmit={handleSubmitEvent}
          />
        )}
      </Box>
    </PaperLayout>
  );
};

export default EventSelection;
