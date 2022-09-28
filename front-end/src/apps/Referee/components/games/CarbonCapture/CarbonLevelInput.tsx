import { FC, ChangeEvent } from 'react';
import { Box, Button, TextField } from '@mui/material';

interface Props {
  value: number;
  onChange: (newValue: number) => void;
}

const CarbonLevelInput: FC<Props> = ({ value, onChange }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(event.target.value));
  const increment = () => onChange(value + 1);
  const incrementMore = () => onChange(value + 3);
  const decrement = () => onChange(value - 1);
  const decrementMore = () => onChange(value - 3);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Button variant='contained' onClick={incrementMore} sx={{ height: '80px', fontSize: '60px' }}>
        +3
      </Button>
      <Button variant='contained' onClick={increment} sx={{ height: '80px', fontSize: '60px' }}>
        +
      </Button>
      <TextField
        onChange={handleChange}
        value={value}
        type='number'
        inputProps={{ style: { fontSize: '72px', textAlign: 'center' } }}
      />
      <Button variant='contained' onClick={decrement} sx={{ height: '80px', fontSize: '60px' }}>
        -
      </Button>
      <Button variant='contained' onClick={decrementMore} sx={{ height: '80px', fontSize: '60px' }}>
        -3
      </Button>
    </Box>
  );
};

export default CarbonLevelInput;
