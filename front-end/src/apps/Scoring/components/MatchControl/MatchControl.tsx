import { FC } from 'react';
import Grid from '@mui/material/Grid';
import PrestartButton from './PrestartButton';
import AudienceDisplayButton from './AudienceDisplayButton';
import FieldPrepButton from './FieldPrepButton';
import StartMatchButton from './StartMatchButton';
import CommitScoresButton from './CommitScoresButton';
import PostResultsButton from './PostResultsButton';

const MatchControl: FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <PrestartButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <AudienceDisplayButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <FieldPrepButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StartMatchButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <CommitScoresButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <PostResultsButton />
      </Grid>
    </Grid>
  );
};

export default MatchControl;
