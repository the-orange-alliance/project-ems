import { FC } from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Tournament } from '@toa-lib/models';

interface Props {
  tournaments: Tournament[] | null | undefined;
  value: string | null | undefined;
  fullWidth?: boolean;
  onChange: (tournamentKey: string) => void;
}

const TournamentDropdown: FC<Props> = ({
  tournaments,
  value,
  fullWidth,
  onChange
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      variant='standard'
      sx={{ m: 1, minWidth: 120 }}
    >
      <Select
        value={value?.toString()}
        onChange={handleChange}
        label='Tournament'
        disabled={!tournaments || tournaments.length === 0}
      >
        {tournaments?.map((t) => (
          <MenuItem
            key={`${t.tournamentKey}-${t.tournamentKey}`}
            value={t.tournamentKey}
          >
            {t.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TournamentDropdown;
