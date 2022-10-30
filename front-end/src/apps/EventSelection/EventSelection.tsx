import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Events from './components/Events';
import EventForm from '../../features/components/EventForm/EventForm';

const EventSelection: FC = () => {
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Selection</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        <Events />
        <EventForm />
      </Box>
    </PaperLayout>
  );
};

export default EventSelection;
