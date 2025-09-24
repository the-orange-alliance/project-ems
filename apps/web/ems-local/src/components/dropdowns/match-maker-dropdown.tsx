import { FC } from 'react';
import { Form, Select } from 'antd';

interface Props {
  quality: string;
  onChange: (quality: string) => void;
}

export const MatchMakerQualityDropdown: FC<Props> = ({ quality, onChange }) => {
  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <Form.Item
      label='Match Maker Quality'
      labelCol={{ span: 24 }}
      style={{ minWidth: 180 }}
    >
      <Select value={quality} onChange={handleChange}>
        <Select.Option value='fair'>Fair</Select.Option>
        <Select.Option value='good'>Good</Select.Option>
        <Select.Option value='best'>Best</Select.Option>
      </Select>
    </Form.Item>
  );
};
