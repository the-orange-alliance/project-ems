import { FC } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface Props {
  id: number;
}

const Day: FC<Props> = ({ id }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Typography>Day {id}</Typography>
      </Grid>
    </Grid>
  );
};

export default Day;
