import { FC } from 'react';
import { Switch } from 'antd';
import { SettingRow } from './setting-row.js';

interface Props {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  inline?: boolean;
  title?: string;
}

export const SwitchSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  title
}) => {
  return (
    <SettingRow name={name} inline={inline} title={title}>
      <Switch checked={value} onChange={onChange} />
    </SettingRow>
  );
};
