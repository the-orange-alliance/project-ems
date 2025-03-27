import { Add } from '@mui/icons-material';
import { Fab, Typography } from '@mui/material';
import { Event } from '@toa-lib/models';
import { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from 'src/api/use-event-data.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import EventsTable from 'src/components/tables/events-table.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';

export const EventSelection: FC = () => {
  const { data: events } = useEvents();
  const navigate = useNavigate();
  const selectEvent = (event: Event) => navigate(`/${event.eventKey}`);
  return events ? (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Selection</Typography>}
      padding
      showSettings
    >
      <>
        <EventsTable events={events} onSelect={selectEvent} />
        <Fab
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          color='primary'
          component={Link}
          to='/create-event'
        >
          <Add />
        </Fab>
      </>
    </PaperLayout>
  ) : (
    <PaperLayout containerWidth='lg' padding showSettings>
      <>
        <PageLoader />
        <div>Loading events...</div>
      </>
    </PaperLayout>
  );
};
