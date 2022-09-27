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
  const incrementMore = () => onChange(value + 3);
  const decrement = () => onChange(value - 1);
  const decrementMore = () => onChange(value - 3);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <Button variant='contained' onClick={incrementMore} sx={{ height: '80px', 'font-size': '60px' }}>
        +3
      </Button>
      <Button variant='contained' onClick={increment} sx={{ height: '80px', 'font-size': '60px' }}>
        +
      </Button>
      <TextField
        onChange={handleChange}
        value={value}
        type='number'
        inputProps={{ style: { 'font-size': '72px', 'textAlign': 'center' } }}
      />
      <Button variant='contained' onClick={decrement} sx={{ height: '80px', 'font-size': '60px' }}>
        -
      </Button>
      <Button variant='contained' onClick={decrementMore} sx={{ height: '80px', 'font-size': '60px' }}>
        -3
      </Button>
    </Box>
  );
};

export default NumberInput;
