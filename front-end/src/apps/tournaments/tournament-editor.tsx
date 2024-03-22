import { Typography } from '@mui/material';
import { FC } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import { PageLoader } from 'src/components/loading/PageLoader';
import PaperLayout from 'src/layouts/PaperLayout';

export const TournamentEditor: FC = () => {
  const { data: event } = useCurrentEvent();
  return event ? (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      title={`/${event.eventKey} | Tournament Editor`}
      titleLink={`/${event.eventKey}/tournament-manager`}
    >
      <div>Tournament Form Here</div>
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
