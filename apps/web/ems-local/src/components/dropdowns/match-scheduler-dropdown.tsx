import { FC } from 'react';
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel
} from '@mui/material';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const MatchSchedulerDropdown: FC<Props> = ({
  value,
  disabled,
  onChange
}) => {
  const handleChange = (event: SelectChangeEvent<string>) =>
    onChange(event.target.value);

  return (
    <FormControl disabled={disabled} sx={{ minWidth: 200 }}>
      <InputLabel>Match Scheduler</InputLabel>
      <Select
        value={value ?? 'standard'}
        onChange={handleChange}
        variant='standard'
      >
        <MenuItem value='fgc_2023'>FGC 2023 RR #1</MenuItem>
        <MenuItem value='fgc_2023_2'>FGC 2023 RR #2</MenuItem>
        <MenuItem value='standard'>Round Robin</MenuItem>
      </Select>
    </FormControl>
  );
};
