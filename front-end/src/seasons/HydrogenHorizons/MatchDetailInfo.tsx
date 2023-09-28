import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import Grid from '@mui/material/Grid';
import { HydrogenHorizons } from '@toa-lib/models';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<HydrogenHorizons.MatchDetails>
> = ({ match }) => {
  if (!match || !match.details) return null;
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6} md={6}>
      <span>WIP</span>
    </Grid>
  </Grid>;
};
