import { FC, ChangeEvent } from 'react';
import { Button, Input, Space } from 'antd';

interface Props {
  value: number;
  onChange: (newValue: number, manuallyTyped: boolean) => void;
  onIncrement?: (newValue: number) => void;
  onDecrement?: (newValue: number) => void;
  disabled?: boolean;
  textFieldDisabled?: boolean;
  min?: number;
  max?: number;
}

export const NumberInput: FC<Props> = ({
  value,
  onChange,
  onIncrement,
  onDecrement,
  disabled,
  textFieldDisabled,
  min = 0,
  max
}) => {
  const handleTypedChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(event.target.value), true);
  const increment = () => {
    if (value >= max!) return;
    let newValue = value + 1;
    if (max !== undefined && newValue > max) newValue = max;
    onIncrement?.(newValue);
    onChange(newValue, false);
  };
  const decrement = () => {
    if (value <= min) return;
    let newValue = value - 1;
    if (min !== undefined && newValue < min) newValue = min;
    onDecrement?.(newValue);
    onChange(newValue, false);
  };

  return (
    <Space direction='horizontal'>
      <Button
        onClick={decrement}
        disabled={disabled}
        style={{ width: '5rem', height: '5rem', fontSize: '2rem' }}
      >
        -
      </Button>
      <Input
        onChange={handleTypedChange}
        value={value}
        type='number'
        disabled={disabled || textFieldDisabled}
        style={{ height: '5rem', fontSize: '2rem', textAlign: 'center' }}
      />
      <Button
        onClick={increment}
        disabled={disabled}
        style={{ width: '5rem', height: '5rem', fontSize: '2rem' }}
      >
        +
      </Button>
    </Space>
  );
};
