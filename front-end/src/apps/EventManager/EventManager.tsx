import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import EventsTable from 'src/features/components/EventsTable/EventsTable';

const EventManager: FC = () => {
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Manager</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        <EventsTable events={[]} />
      </Box>
    </PaperLayout>
  );
};

export default EventManager;
