import { FC } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

const MatchParameters: FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <TextField label='' />
      </Grid>
    </Grid>
  );
};

export default MatchParameters;
