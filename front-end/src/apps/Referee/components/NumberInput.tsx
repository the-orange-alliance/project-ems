import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface Props {
  value: number;
  onChange: (newValue: number) => void;
}

const NumberInput: FC<Props> = ({ value, onChange }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(event.target.value));
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(value - 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
      <Button variant='contained' onClick={decrement}>
        -
      </Button>
      <TextField onChange={handleChange} value={value} type='number' />
      <Button variant='contained' onClick={increment}>
        +
      </Button>
    </Box>
  );
};

export default NumberInput;