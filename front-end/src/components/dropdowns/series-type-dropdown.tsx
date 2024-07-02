import { FC } from 'react';
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel
} from '@mui/material';

interface Props {
  value: number | undefined;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export const SeriesTypeDropdown: FC<Props> = ({
  value,
  disabled,
  onChange
}) => {
  const handleChange = (event: SelectChangeEvent<string>) =>
    onChange(parseInt(event.target.value));

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Event Type</InputLabel>
      <Select
        value={value?.toString() ?? '3'}
        onChange={handleChange}
        variant='standard'
      >
        <MenuItem value='1'>Best of 1</MenuItem>
        <MenuItem value='3'>Best of 3</MenuItem>
        <MenuItem value='5'>Best of 5</MenuItem>
      </Select>
    </FormControl>
  );
};
