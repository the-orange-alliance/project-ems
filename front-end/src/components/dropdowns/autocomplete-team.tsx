import { FC, SyntheticEvent } from 'react';
import { useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { teamIdentifierAtom } from 'src/stores/recoil';
import { Team } from '@toa-lib/models';

interface Props {
  teamKey: number | null;
  disabled?: boolean;
  white?: boolean;
  teams?: Team[];
  onChange: (team: Team | null) => void;
}

export const AutocompleteTeam: FC<Props> = ({
  teamKey,
  disabled,
  white,
  teams,
  onChange
}) => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const team = teams?.find((t) => t.teamKey === teamKey);

  const handleChange = (e: SyntheticEvent, team: Team | null) => onChange(team);

  return (
    <Autocomplete
      fullWidth
      disablePortal
      disabled={disabled}
      value={team || null}
      options={teams ?? []}
      getOptionLabel={(option) => `${option[identifier]}`}
      renderOption={(props, option) => (
        <Box component='li' {...props}>
          <span
            className={
              'flag-icon flag-icon-' + option.countryCode.toLowerCase()
            }
          ></span>
          &nbsp;
          <span>{option[identifier]}</span>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          inputProps={{
            ...params.inputProps,
            style: {
              color: white ? '#ffffff' : '#000000'
            }
          }}
          sx={{ padding: 0, margin: 0 }}
        />
      )}
      onChange={handleChange}
      sx={{
        padding: 0,
        '& fieldset': {
          borderColor: white ? '#ffffff' : '#000000 !important'
        },
        '& input': {
          padding: '0 !important'
        },
        '& .MuiOutlinedInput-root': {
          paddingTop: '7px',
          paddingBottom: '7px'
        }
      }}
    />
  );
};
