import { FC, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Tournament } from '@toa-lib/models';
import { useTournamentsForEvent } from 'src/api/use-tournament-data';

interface Props {
  eventKey: string;
  value: string | null;
  fullWidth?: boolean;
  onChange: (tournament: Tournament | null) => void;
}

export const EventTournamentsDropdown: FC<Props> = ({
  eventKey,
  value,
  fullWidth,
  onChange
}) => {
  const { data: tournaments } = useTournamentsForEvent(eventKey);

  useEffect(() => {
    if (!value && tournaments && tournaments.length > 0) {
      onChange(tournaments[0]);
    }
  }, [tournaments]);

  const handleChange = (event: SelectChangeEvent) => {
    if (!tournaments) return;
    onChange(
      tournaments.find((t) => t.tournamentKey === event.target.value) ?? null
    );
  };

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
        {tournaments?.map((t) => (
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
