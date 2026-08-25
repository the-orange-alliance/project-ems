import { FC, ChangeEvent } from 'react';
import { Input } from 'antd';
import { SettingRow } from './setting-row.js';

interface Props {
  name: string;
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const TextSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  title,
  fullWidth,
  disabled
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value);

  return (
    <SettingRow name={name} inline={inline} title={title} disabled={disabled}>
      <Input
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={{ margin: 8, width: fullWidth ? '100%' : 220 }}
      />
    </SettingRow>
  );
};
