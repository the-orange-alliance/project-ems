import { FC, SyntheticEvent } from 'react';
import { useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { teamsAtom } from 'src/stores/Recoil';
import { Team } from '@toa-lib/models';

interface Props {
  teamKey: number;
  onChange: (team: Team | null) => void;
}

const ParticipantDropdown: FC<Props> = ({ teamKey, onChange }) => {
  const teams = useRecoilValue(teamsAtom);
  const team = teams.find((t) => t.teamKey === teamKey);

  const handleChange = (e: SyntheticEvent, team: Team | null) => onChange(team);

  return (
    <Autocomplete
      fullWidth
      disablePortal
      value={team}
      options={teams}
      getOptionLabel={(option) => option.city}
      renderOption={(props, option) => (
        <Box component='li' {...props}>
          <span
            className={
              'flag-icon flag-icon-' + option.countryCode.toLowerCase()
            }
          ></span>
          &nbsp;
          <span>{option.city}</span>
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} inputProps={{ ...params.inputProps }} />
      )}
      onChange={handleChange}
    />
  );
};

export default ParticipantDropdown;
