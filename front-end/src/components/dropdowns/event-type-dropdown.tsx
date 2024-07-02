import { FC } from 'react';
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel
} from '@mui/material';
import { EventTypes } from '@toa-lib/models';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const EventTypeDropdown: FC<Props> = ({ value, disabled, onChange }) => {
  const handleChange = (event: SelectChangeEvent<string>) =>
    onChange(event.target.value);

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Event Type</InputLabel>
      <Select value={value ?? ''} onChange={handleChange} variant='standard'>
        {EventTypes.map((type) => (
          <MenuItem key={type.key} value={type.key}>
            {type.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
