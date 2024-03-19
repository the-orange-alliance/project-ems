import { Grid } from '@mui/material';
import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { useEvent } from 'src/api/use-event-data';
import { PageLoader } from 'src/components/loading/PageLoader';
import { useComponents } from 'src/seasons';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';

export const MatchDetails: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: event } = useEvent(eventKey);
  const seasonComponents = useComponents(event?.seasonKey);
  return event && seasonComponents ? (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <seasonComponents.RedScoreBreakdown />
      </Grid>
      <Grid item xs={12} sm={6}>
        <seasonComponents.BlueScoreBreakdown />
      </Grid>
    </Grid>
  ) : (
    <PageLoader />
  );
};
