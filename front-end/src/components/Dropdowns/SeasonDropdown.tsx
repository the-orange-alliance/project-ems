import { FC } from 'react';
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel
} from '@mui/material';
import { Seasons } from '@toa-lib/models';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const SeasonDropdown: FC<Props> = ({ value, disabled, onChange }) => {
  const handleChange = (event: SelectChangeEvent<string>) =>
    onChange(event.target.value);

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Season</InputLabel>
      <Select value={value ?? ''} onChange={handleChange} variant='standard'>
        {Seasons.map((s) => (
          <MenuItem key={s.key} value={s.key}>
            [{s.key.toUpperCase().replaceAll('_', ' ')}]&nbsp;{s.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SeasonDropdown;
