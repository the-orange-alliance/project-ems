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
  // The value can arrive non-finite: `null` from a field the server has never had
  // a number for, or NaN from an earlier bad write. Stepping off that would send
  // NaN onward, so the arithmetic below always works from a real number.
  const current = Number.isFinite(value) ? value : min;

  const handleTypedChange = (event: ChangeEvent<HTMLInputElement>) => {
    const typed = parseInt(event.target.value, 10);
    // An emptied box parses to NaN. Reporting that upward wrote NaN into the match
    // details, which reaches clients as `null` and blanks the score - so an
    // unparseable box reports nothing and keeps the last good value.
    if (!Number.isFinite(typed)) return;
    onChange(typed, true);
  };
  const increment = () => {
    if (max !== undefined && current >= max) return;
    let newValue = current + 1;
    if (max !== undefined && newValue > max) newValue = max;
    onIncrement?.(newValue);
    onChange(newValue, false);
  };
  const decrement = () => {
    if (current <= min) return;
    let newValue = current - 1;
    if (newValue < min) newValue = min;
    onDecrement?.(newValue);
    onChange(newValue, false);
  };

  return (
    <Space orientation='horizontal'>
      <Button
        onClick={decrement}
        disabled={disabled}
        style={{ width: '5rem', height: '5rem', fontSize: '2rem' }}
      >
        -
      </Button>
      <Input
        onChange={handleTypedChange}
        value={current}
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
