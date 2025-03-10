import { Grid, FormControl, TextField, Button } from '@mui/material';
import { Tournament, defaultTournament } from '@toa-lib/models';
import { FC, ChangeEvent, useState, useEffect } from 'react';
import { TournamentDropdown } from '../dropdowns/tournament-level-dropdown';

const FormField: FC<{
  name: string;
  label: string;
  value: string | number;
  type?: string;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, type, disabled, onChange }) => {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <FormControl fullWidth>
        <TextField
          name={name}
          label={label}
          value={value}
          onChange={onChange}
          variant='standard'
          type={type ?? 'text'}
          disabled={disabled}
        />
      </FormControl>
    </Grid>
  );
};

const Fields: FC<{
  tournament: Tournament;
  disabled?: boolean;
  onUpdate: (fields: string[]) => void;
}> = ({ tournament, disabled, onUpdate }) => {
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

interface Props {
  initialTournament?: Tournament;
  loading?: boolean;
  onSubmit: (tournament: Tournament) => void;
}

export const TournamentForm: FC<Props> = ({
  initialTournament,
  loading,
  onSubmit
}) => {
  const [tournament, setTournament] = useState({
    ...(initialTournament ?? defaultTournament)
  });

  useEffect(() => {
    if (initialTournament) setTournament(initialTournament);
  }, [initialTournament]);

  const handleSubmit = () => onSubmit?.(tournament);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    setTournament({
      ...tournament,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleLevelChange = (tournamentLevel: number) => {
    setTournament({
      ...tournament,
      tournamentLevel
    });
  };

  const handleFieldUpdate = (fields: string[]) => {
    setTournament({
      ...tournament,
      fields,
      fieldCount: fields.length
    });
  };

  return (
    <>
      <Grid container spacing={3}>
        <FormField
          name='tournamentKey'
          label='Tournament Key'
          value={tournament.tournamentKey}
          onChange={handleChange}
          disabled={typeof initialTournament !== 'undefined' || loading}
        />
        <FormField
          name='name'
          label='Name'
          value={tournament.name}
          onChange={handleChange}
          disabled={loading}
        />
        <Grid item xs={12} sm={6} md={4}>
          <TournamentDropdown
            fullWidth
            value={tournament.tournamentLevel}
            onChange={handleLevelChange}
            disabled={loading}
          />
        </Grid>
      </Grid>
      <Fields
        tournament={tournament}
        disabled={loading}
        onUpdate={handleFieldUpdate}
      />
      <Button
        variant='contained'
        sx={{ marginTop: (theme) => theme.spacing(2) }}
        onClick={handleSubmit}
        disabled={loading}
      >
        Submit Changes
      </Button>
    </>
  );
};
