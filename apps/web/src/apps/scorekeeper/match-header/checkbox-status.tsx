import { FC } from 'react';
import { Checkbox } from 'antd';

interface Props {
  value: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

const CheckboxStatus: FC<Props> = ({ value, disabled, onChange }) => {
  const toggle = () => {
    onChange?.(!value);
  };
  return (
    <Checkbox
      disabled={disabled}
      checked={value}
      onChange={toggle}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    />
  );
};

export default CheckboxStatus;
