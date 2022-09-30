import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface Props {
  value: number;
  onChange: (newValue: number) => void;
  disabled?: boolean;
}

const NumberInput: FC<Props> = ({ value, onChange, disabled }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(event.target.value));
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(value - 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
      <Button variant='contained' onClick={decrement} disabled={disabled}>
        -
      </Button>
      <TextField onChange={handleChange} value={value} type='number' disabled={disabled} />
      <Button variant='contained' onClick={increment} disabled={disabled}>
        +
      </Button>
    </Box>
  );
};

export default NumberInput;
