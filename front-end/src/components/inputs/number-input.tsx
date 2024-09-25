import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface Props {
  value: number;
  onChange: (newValue: number, manuallyTyped: boolean) => void;
  onIncrement?: (newValue: number) => void;
  onDecrement?: (newValue: number) => void;
  disabled?: boolean;
  textFieldDisabled?: boolean;
}

export const NumberInput: FC<Props> = ({
  value,
  onChange,
  onIncrement,
  onDecrement,
  disabled,
  textFieldDisabled
}) => {
  const handleTypedChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(event.target.value), true);
  const increment = () => {
    const newValue = value + 1;
    onIncrement?.(newValue);
    onChange(newValue, false);
  };
  const decrement = () => {
    const newValue = value - 1;
    onDecrement?.(newValue);
    onChange(newValue, false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        justifyContent: 'center'
      }}
    >
      <Button variant='contained' onClick={decrement} disabled={disabled}>
        -
      </Button>
      <TextField
        onChange={handleTypedChange}
        value={value}
        type='number'
        disabled={disabled || textFieldDisabled}
        sx={{ minWidth: '75px' }}
      />
      <Button variant='contained' onClick={increment} disabled={disabled}>
        +
      </Button>
    </Box>
  );
};
