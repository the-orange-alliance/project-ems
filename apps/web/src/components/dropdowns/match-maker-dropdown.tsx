import { FC } from 'react';
import FormControl from '@mui/material/FormControl';
import { InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';

interface Props {
  quality: string;
  onChange: (quality: string) => void;
}

export const MatchMakerQualityDropdown: FC<Props> = ({ quality, onChange }) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl sx={{ minWidth: 180 }}>
      <InputLabel>Match Maker Quality</InputLabel>
      <Select
        value={quality}
        onChange={handleChange}
        label='Match Maker Quality'
      >
        <MenuItem value='fair'>Fair</MenuItem>
        <MenuItem value='good'>Good</MenuItem>
        <MenuItem value='best'>Best</MenuItem>
      </Select>
    </FormControl>
  );
};
