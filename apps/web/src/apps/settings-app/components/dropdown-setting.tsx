import { FC } from 'react';
import { Select } from 'antd';
import { SettingRow } from './setting-row.js';

interface Props {
  name: string;
  value: any;
  options: any[];
  onChange: (value: any) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
}

export const DropdownSetting: FC<Props> = ({
  name,
  value,
  options,
  onChange,
  inline,
  title,
  fullWidth
}) => {
  return (
    <SettingRow name={name} inline={inline} title={title}>
      <Select
        value={value}
        onChange={onChange}
        style={{ margin: 8, width: fullWidth ? '100%' : 223 }}
        options={options.map((o) => ({ value: o, label: o }))}
      />
    </SettingRow>
  );
};
