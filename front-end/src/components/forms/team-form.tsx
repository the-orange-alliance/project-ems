import { FC, ChangeEvent, useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import { Team, defaultTeam } from '@toa-lib/models';

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
          disabled={disabled}
          type={type ?? 'text'}
        />
      </FormControl>
    </Grid>
  );
};

interface Props {
  initialTeam?: Team;
  loading?: boolean;
  onSubmit?: (team: Team) => void;
}

export const TeamForm: FC<Props> = ({ initialTeam, loading, onSubmit }) => {
  const [team, setTeam] = useState({ ...(initialTeam ?? defaultTeam) });

  useEffect(() => {
    if (initialTeam) setTeam(initialTeam);
  }, [initialTeam]);

  const handleSubmit = () => onSubmit?.(team);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    setTeam({
      ...team,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  return (
    <div>
      <Grid container spacing={3}>
        <FormField
          name='teamKey'
          label='Team Key'
          value={team.teamKey}
          onChange={handleChange}
          disabled={typeof initialTeam !== 'undefined' || loading}
        />
        <FormField
          name='teamNameShort'
          label='Team Name (Short)'
          value={team.teamNameShort}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='teamNameLong'
          label='Team Name (Long)'
          value={team.teamNameLong}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='robotName'
          label='Robot Name'
          value={team.robotName}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='city'
          label='City'
          value={team.city}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={team.stateProv}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='country'
          label='Country'
          value={team.country}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='countryCode'
          label='countryCode'
          value={team.countryCode}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='rookieYear'
          label='Rookie Year'
          type='number'
          value={team.rookieYear}
          onChange={handleChange}
          disabled={loading}
        />
        <Grid item xs={12} sm={6} md={3}>
          <Button variant='contained' onClick={handleSubmit}>
            {initialTeam ? 'Modify Team' : 'Create Team'}
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};
