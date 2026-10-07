import { FC, ChangeEvent, useState } from 'react';
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
  // What the referee is typing, held locally so the box can be emptied or hold a
  // partial entry mid-edit. `null` means not editing: the box shows `current`.
  const [draft, setDraft] = useState<string | null>(null);

  const handleTypedChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    const typed = parseInt(event.target.value, 10);
    // An emptied box parses to NaN. Reporting that upward wrote NaN into the match
    // details, which reaches clients as `null` and blanks the score - so an
    // unparseable box reports nothing and keeps the last good value.
    if (!Number.isFinite(typed)) return;
    onChange(typed, true);
  };
  // Leaving the box drops the draft, so an empty box snaps back to the last good value.
  const endEdit = () => setDraft(null);
  const increment = () => {
    endEdit();
    if (max !== undefined && current >= max) return;
    let newValue = current + 1;
    if (max !== undefined && newValue > max) newValue = max;
    onIncrement?.(newValue);
    onChange(newValue, false);
  };
  const decrement = () => {
    endEdit();
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
        onBlur={endEdit}
        onPressEnter={(e) => e.currentTarget.blur()}
        value={draft ?? current}
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
