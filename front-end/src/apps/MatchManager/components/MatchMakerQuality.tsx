import { FC, ChangeEvent } from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

interface Props {
  quality: string;
  onChange: (quality: string) => void;
}

const MatchMakerQuality: FC<Props> = ({ quality, onChange }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl>
      <FormLabel>Match Maker Quality</FormLabel>
      <RadioGroup value={quality} onChange={handleChange}>
        <FormControlLabel
          value='fair'
          control={<Radio />}
          label='Fair Quality'
        />
        <FormControlLabel
          value='good'
          control={<Radio />}
          label='Good Quality'
        />
        <FormControlLabel
          value='best'
          control={<Radio />}
          label='Best Quality'
        />
      </RadioGroup>
    </FormControl>
  );
};

export default MatchMakerQuality;
