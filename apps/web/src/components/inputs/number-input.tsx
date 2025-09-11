import { FC, ChangeEvent } from 'react';
import { Button, Input, Space } from 'antd';

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
