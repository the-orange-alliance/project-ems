import { FC, useState } from 'react';
import { DesktopDatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';

interface Props {
  label: string;
  value: string;
  format?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const DatePicker: FC<Props> = ({
  label,
  value,
  format,
  disabled,
  onChange
}) => {
  const [date, setDate] = useState<DateTime | null>(DateTime.fromISO(value));

  const handleChange = (newValue: DateTime | null) => {
    setDate(newValue);
    onChange(newValue ? newValue.toISO() ?? '' : '');
  };

  return (
    <DesktopDatePicker
      label={label}
      format={format ? format : 'DDDD'}
      value={date}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};

export default DatePicker;
