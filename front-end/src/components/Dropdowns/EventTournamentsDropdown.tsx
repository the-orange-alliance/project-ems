import { FC, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useRecoilValue } from 'recoil';
import { tournamentsByEventAtomFam } from 'src/stores/NewRecoil';

interface Props {
  eventKey: string;
  value: string | null;
  fullWidth?: boolean;
  onChange: (value: string) => void;
}

const EventTournamentsDropdown: FC<Props> = ({
  eventKey,
  value,
  fullWidth,
  onChange
}) => {
  const tournaments = useRecoilValue(tournamentsByEventAtomFam(eventKey));

  useEffect(() => {
    if (!value && tournaments.length > 0) {
      onChange(tournaments[0].tournamentKey);
    }
  }, [tournaments]);

  const handleChange = (event: SelectChangeEvent) =>
    onChange(event.target.value);

  return (
    <FormControl
      fullWidth={fullWidth}
      variant='standard'
      sx={{ m: 1, minWidth: 120 }}
    >
      <Select
        value={value?.toString() ?? tournaments?.[0]?.tournamentKey}
        onChange={handleChange}
        label='Tournament'
      >
        {tournaments.map((t) => (
          <MenuItem
            key={`${eventKey}-${t.tournamentKey}`}
            value={t.tournamentKey}
          >
            {t.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default EventTournamentsDropdown;
