import { FC } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { Tournament } from '@toa-lib/models';

interface Props {
  tournament: Tournament;
  onUpdate: (fields: string[]) => void;
}

const Fields: FC<Props> = ({ tournament }) => {
  return (
    <Grid
      container
      spacing={3}
      sx={{ paddingTop: (theme) => theme.spacing(1) }}
    >
      {tournament.fields.map((f, i) => (
        <Grid key={`field-${i}`} item>
          Field {i}
        </Grid>
      ))}
      <Grid item xs={6} md={3} lg={2}>
        <Button variant='contained' fullWidth>
          Add Field
        </Button>
      </Grid>
      <Grid item xs={6} md={3} lg={2}>
        <Button variant='contained' fullWidth>
          Remove Field
        </Button>
      </Grid>
    </Grid>
  );
};

export default Fields;
