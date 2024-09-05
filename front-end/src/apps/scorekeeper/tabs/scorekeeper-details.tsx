import { Grid } from '@mui/material';
import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import { matchOccurringAtom } from 'src/stores/recoil';

export const ScorekeeperDetails: FC = () => {
  const match = useRecoilValue(matchOccurringAtom);
  const seasonComponents = useSeasonComponents();
  return seasonComponents && match ? (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <seasonComponents.RedScoreBreakdown match={match} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <seasonComponents.BlueScoreBreakdown match={match} />
      </Grid>
    </Grid>
  ) : null;
};
