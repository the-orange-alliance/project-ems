import { FC } from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  FINALS_LEVEL,
  OCTOFINALS_LEVEL,
  PRACTICE_LEVEL,
  QUALIFICATION_LEVEL,
  QUARTERFINALS_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL,
  SEMIFINALS_LEVEL,
  TEST_LEVEL
} from '@toa-lib/models';

interface Props {
  value: number;
  fullWidth?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export const TournamentDropdown: FC<Props> = ({
  value,
  fullWidth,
  disabled,
  onChange
}) => {
  const handleChange = (event: SelectChangeEvent) =>
    onChange(parseInt(event.target.value));

  return (
    <FormControl
      fullWidth={fullWidth}
      variant='standard'
      sx={{ m: 1, minWidth: 120 }}
    >
      <Select
        value={value.toString()}
        onChange={handleChange}
        disabled={disabled}
        label='Tournament'
      >
        <MenuItem value={TEST_LEVEL.toString()}>Test</MenuItem>
        <MenuItem value={PRACTICE_LEVEL.toString()}>Practice</MenuItem>
        <MenuItem value={QUALIFICATION_LEVEL.toString()}>
          Qualification
        </MenuItem>
        <MenuItem value={ROUND_ROBIN_LEVEL.toString()}>Round Robin</MenuItem>
        <MenuItem value={RANKING_LEVEL.toString()}>Ranking</MenuItem>
        <MenuItem value={OCTOFINALS_LEVEL.toString()}>Octofinals</MenuItem>
        <MenuItem value={QUARTERFINALS_LEVEL.toString()}>
          Quarterfinals
        </MenuItem>
        <MenuItem value={SEMIFINALS_LEVEL.toString()}>Semifinals</MenuItem>
        <MenuItem value={FINALS_LEVEL.toString()}>Finals</MenuItem>
      </Select>
    </FormControl>
  );
};
