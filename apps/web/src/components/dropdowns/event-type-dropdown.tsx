import { FC } from 'react';
import { Select } from 'antd';
import { EventTypes } from '@toa-lib/models';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const EventTypeDropdown: FC<Props> = ({ value, disabled, onChange }) => {
  const handleChange = (value: string) => onChange(value);

  return (
    <Select
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      size='large'
    >
      {EventTypes.map((type) => (
        <Select.Option key={type.key} value={type.key}>
          {type.name}
        </Select.Option>
      ))}
    </Select>
  );
};
