import { ChangeEvent, FC } from 'react';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import { Tournament } from '@toa-lib/models';

interface Props {
  tournament: Tournament;
  disabled?: boolean;
  onUpdate: (fields: string[]) => void;
}

const Fields: FC<Props> = ({ tournament, disabled, onUpdate }) => {
  const handleAdd = () => {
    onUpdate([...tournament.fields, `Field ${tournament.fields.length + 1}`]);
  };

  const handleRemove = () => {
    const clone = [...tournament.fields];
    clone.pop();
    onUpdate(clone);
  };

  const updateFieldName = (i: number, name: string) => {
    const clone = [...tournament.fields];
    clone[i] = name;
    onUpdate(clone);
  };

  return (
    <Grid
      container
      spacing={3}
      sx={{ paddingTop: (theme) => theme.spacing(1) }}
    >
      {tournament.fields.map((f: string, i: number) => {
        const onChange = (e: ChangeEvent<HTMLInputElement>) => {
          updateFieldName(i, e.target.value);
        };
        return (
          <Grid key={`field-${i}`} item xs={12}>
            <FormControl>
              <TextField
                name='fieldName'
                label='Field Name'
                value={tournament.fields[i]}
                variant='standard'
                type='text'
                disabled={disabled}
                onChange={onChange}
              />
            </FormControl>
          </Grid>
        );
      })}
      <Grid item xs={6} md={3} lg={2}>
        <Button variant='contained' fullWidth onClick={handleAdd}>
          Add Field
        </Button>
      </Grid>
      <Grid item xs={6} md={3} lg={2}>
        <Button
          variant='contained'
          fullWidth
          onClick={handleRemove}
          disabled={tournament.fields.length <= 1}
        >
          Remove Field
        </Button>
      </Grid>
    </Grid>
  );
};

export default Fields;
