import { ColorPicker, Space, Typography } from 'antd';
import { AggregationColor } from 'antd/es/color-picker/color.js';
import { FC, CSSProperties } from 'react';

interface Props {
  name: string;
  value: string;
  format: 'hex' | 'string';
  onChange: (value: string) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const ColorSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  title,
  fullWidth,
  disabled,
  format
}) => {
  const handleChange = (value: AggregationColor) => {
    onChange(value.toHex());
  };

  const containerStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  };

  const hoverStyle: CSSProperties = {
    ...containerStyle,
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  };

  const labelStyle: CSSProperties = {
    fontWeight: 'bold',
    marginRight: 'auto'
  };

  const colorPickerStyle: CSSProperties = {
    width: fullWidth ? '100%' : '224px'
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, containerStyle);
      }}
      title={title}
    >
      <Space
        direction={inline ? 'horizontal' : 'vertical'}
        style={{ width: '100%' }}
      >
        <Typography.Text style={labelStyle}>{name}</Typography.Text>
        <ColorPicker
          value={format === 'string' ? `#${value}` : value}
          onChange={handleChange}
          disabled={disabled}
          style={colorPickerStyle}
          showText
        />
      </Space>
    </div>
  );
};
