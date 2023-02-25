import { FC } from 'react';
import PaperLayout from '@layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import EventForm from '@features/components/EventForm/EventForm';
import { useRecoilState } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';

const EventManager: FC = () => {
  const [event, setEvent] = useRecoilState(currentEventSelector);
  return (
    <PaperLayout
      title={`${event?.eventName} | Event Manager`}
      titleLink={`/${event?.eventKey}`}
      containerWidth='lg'
      header={<Typography variant='h4'>Event Manager</Typography>}
      padding
    >
      <Box
        sx={{
          marginBottom: (theme) => theme.spacing(2)
        }}
      >
        <EventForm event={event} onChange={setEvent} />
      </Box>
    </PaperLayout>
  );
};

export default EventManager;
