import { FC } from 'react';
import { Input, InputNumber } from 'antd';
import { SettingRow } from './setting-row.js';

interface Props {
  name: string;
  value: number;
  onChange: (value: number) => void;
  inline?: boolean;
  type?: 'text' | 'number' | 'password';
  title?: string;
  fullWidth?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

export const NumberSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  type = 'text',
  title,
  fullWidth,
  step,
  min,
  max
}) => {
  const style = { margin: 8, width: fullWidth ? '100%' : 220 };

  return (
    <SettingRow name={name} inline={inline} title={title}>
      {type === 'password' ? (
        <Input.Password
          value={String(value)}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? 0 : parsed);
          }}
          style={style}
        />
      ) : (
        <InputNumber
          value={value}
          onChange={(v) => onChange(v ?? 0)}
          step={step}
          min={min}
          max={max}
          style={style}
        />
      )}
    </SettingRow>
  );
};
