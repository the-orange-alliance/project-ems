import { FC, ChangeEvent, useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import ViewReturn from '@components/ViewReturn/ViewReturn';
import {
  currentTeamKeyAtom,
  currentTeamSelector,
  currentTournamentKeyAtom,
  currentTournamentSelector
} from '@stores/NewRecoil';
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

  const onReturn = () => {
    setTournamentKey(null);
  };

  const handleSubmit = () => onSubmit(tournament);

  return (
    <div>
      <ViewReturn title='Teams' onClick={onReturn} />
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
        <FormField
          name='tournamentLevel'
          label='Level'
          value={tournament.tournamentLevel}
          onChange={handleChange}
        />
        <FormField
          name='fieldCount'
          label='Field Count'
          type='number'
          value={tournament.fieldCount}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={12} md={12}>
          <Button variant='contained' onClick={handleSubmit}>
            Submit Changes
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default TournamentForm;
