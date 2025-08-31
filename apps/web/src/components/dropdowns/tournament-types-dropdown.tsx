import { FC } from 'react';
import { Select } from 'antd';
import { TournamentType, TournamentTypes } from '@toa-lib/models';

const { Option } = Select;

interface Props {
  value: TournamentType | undefined;
  fullWidth?: boolean;
  disabled?: boolean;
  onChange: (value: TournamentType) => void;
}

export const TournamentTypesDropdown: FC<Props> = ({
  value,
  fullWidth,
  disabled,
  onChange
}) => {
  const handleChange = (value: TournamentType) => onChange(value);

  return (
    <Select
      value={value ?? 'Test'}
      onChange={handleChange}
      disabled={disabled}
      style={{ width: fullWidth ? '100%' : 200 }}
      size='large'
    >
      {TournamentTypes.map((type) => (
        <Option key={type.key} value={type.key}>
          {type.name}
        </Option>
      ))}
    </Select>
  );
};
