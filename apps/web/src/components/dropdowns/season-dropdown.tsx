import { FC } from 'react';
import { Select } from 'antd';
import { Seasons } from '@toa-lib/models';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const SeasonDropdown: FC<Props> = ({ value, disabled, onChange }) => {
  const handleChange = (value: string) => onChange(value);

  return (
    <Select
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      size='large'
    >
      {Seasons.map((s) => (
        <Select.Option key={s.key} value={s.key}>
          [{s.key.toUpperCase().replaceAll('_', ' ')}]&nbsp;{s.name}
        </Select.Option>
      ))}
    </Select>
  );
};
