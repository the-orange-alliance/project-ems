import { FC } from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  OCTOFINALS_LEVEL,
  PRACTICE_LEVEL,
  QUALIFICATION_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL,
  TEST_LEVEL,
  TournamentType
} from '@toa-lib/models';

interface Props {
  value: TournamentType;
  onChange: (value: number) => void;
}

const TournamentDropdown: FC<Props> = ({ value, onChange }) => {
  const handleChange = (event: SelectChangeEvent) =>
    onChange(parseInt(event.target.value));

  return (
    <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
      <Select value={value} onChange={handleChange} label='Tournament'>
        <MenuItem value={TEST_LEVEL}>Test</MenuItem>
        <MenuItem value={PRACTICE_LEVEL}>Practice</MenuItem>
        <MenuItem value={QUALIFICATION_LEVEL}>Quals</MenuItem>
        <MenuItem value={ROUND_ROBIN_LEVEL}>Round Robin</MenuItem>
        <MenuItem value={RANKING_LEVEL}>Ranking</MenuItem>
        <MenuItem value={OCTOFINALS_LEVEL}>Elims</MenuItem>
      </Select>
    </FormControl>
  );
};

export default TournamentDropdown;
