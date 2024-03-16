import { FC, ChangeEvent, useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import { currentTeamKeyAtom, currentTeamSelector } from '@stores/NewRecoil';
import { Team } from '@toa-lib/models';

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
  onSubmit: (team: Team) => void;
}

const TeamForm: FC<Props> = ({ onSubmit }) => {
  const setTeamKey = useSetRecoilState(currentTeamKeyAtom);
  const [team, setTeam] = useState(useRecoilValue(currentTeamSelector));

  if (!team) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    setTeam({
      ...team,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const onReturn = () => {
    setTeamKey(null);
  };

  const handleSubmit = () => onSubmit(team);

  return (
    <div>
      <ViewReturn title='Teams' onClick={onReturn} />
      <Grid container spacing={3}>
        <FormField
          name='teamKey'
          label='Team Key'
          value={team.teamKey}
          onChange={handleChange}
        />
        <FormField
          name='teamNameShort'
          label='Team Name (Short)'
          value={team.teamNameShort}
          onChange={handleChange}
        />
        <FormField
          name='teamNameLong'
          label='Team Name (Long)'
          value={team.teamNameLong}
          onChange={handleChange}
        />
        <FormField
          name='robotName'
          label='Robot Name'
          value={team.robotName}
          onChange={handleChange}
        />
        <FormField
          name='city'
          label='City'
          value={team.city}
          onChange={handleChange}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={team.stateProv}
          onChange={handleChange}
        />
        <FormField
          name='country'
          label='Country'
          value={team.country}
          onChange={handleChange}
        />
        <FormField
          name='countryCode'
          label='countryCode'
          value={team.countryCode}
          onChange={handleChange}
        />
        <FormField
          name='rookieYear'
          label='Rookie Year'
          value={team.rookieYear}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6} md={3}>
          <Button variant='contained' onClick={handleSubmit}>
            Submit Changes
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default TeamForm;
