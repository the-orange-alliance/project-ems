import { FC, ChangeEvent, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import TournamentDropdown from 'src/components/dropdowns/TournamentDropdown';
import {
  currentTournamentKeyAtom,
  currentTournamentSelector
} from '@stores/NewRecoil';
import Fields from './Fields';
import { Tournament } from '@toa-lib/models';

const FormField: FC<{
  name: string;
  label: string;
  value: string | number;
  type?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, type, onChange }) => {
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
        />
      </FormControl>
    </Grid>
  );
};

interface Props {
  onSubmit: (tournament: Tournament) => void;
}

const TournamentForm: FC<Props> = ({ onSubmit }) => {
  const setTournamentKey = useSetRecoilState(currentTournamentKeyAtom);
  const [tournament, setTournament] = useState(
    useRecoilValue(currentTournamentSelector)
  );

  if (!tournament) return null;

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

  const onReturn = () => {
    setTournamentKey(null);
  };

  const handleSubmit = () => onSubmit(tournament);

  return (
    <>
      <ViewReturn title='Tournaments' onClick={onReturn} sx={{ mb: 1 }} />
      <Grid container spacing={3}>
        <FormField
          name='tournamentKey'
          label='Tournament Key'
          value={tournament.tournamentKey}
          onChange={handleChange}
        />
        <FormField
          name='name'
          label='Name'
          value={tournament.name}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6} md={4}>
          <TournamentDropdown
            fullWidth
            value={tournament.tournamentLevel}
            onChange={handleLevelChange}
          />
        </Grid>
      </Grid>
      <Fields tournament={tournament} onUpdate={handleFieldUpdate} />
      <Button
        variant='contained'
        sx={{ marginTop: (theme) => theme.spacing(2) }}
        onClick={handleSubmit}
      >
        Submit Changes
      </Button>
    </>
  );
};

export default TournamentForm;
