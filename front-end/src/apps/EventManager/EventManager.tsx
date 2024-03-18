import { FC } from 'react';
import PaperLayout from '@layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import EventForm from 'src/components/forms/EventForm/EventForm';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { currentEventKeyAtom, currentEventSelector } from '@stores/NewRecoil';
import { useEvent } from 'src/api/use-event-data';
import { PageLoader } from 'src/components/loading/PageLoader';

const EventManager: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const setEvent = useSetRecoilState(currentEventSelector);
  const { data: event } = useEvent(eventKey);
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
        {!event && <PageLoader />}
        {event && <EventForm event={event} onChange={setEvent} />}
      </Box>
    </PaperLayout>
  );
};

export default EventManager;
