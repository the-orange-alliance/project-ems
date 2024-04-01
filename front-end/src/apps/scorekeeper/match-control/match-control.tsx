import { Grid } from '@mui/material';
import { FC } from 'react';
import { PrestartButton } from './prestart-button';
import { DisplaysButton } from './displays-button';
import { FieldPrepButton } from './field-prep-button';
import { StartMatchButton } from './start-match-button';
import { CommitScoresButton } from './commit-scores-button';
import { PostResultsButton } from './post-results-button';

export const MatchControl: FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <PrestartButton />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <DisplaysButton />
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
