import { Button } from 'antd';
import SettingsRow from './settings-row.js';
import {
  ButtonColorType,
  ButtonVariantType
} from 'antd/es/button/buttonHelpers.js';
import { MouseEventHandler } from 'react';

interface BooleanRowProps {
  title: string;
  buttonText: string;
  variant?: ButtonVariantType;
  color?: ButtonColorType;
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler;
}

const BooleanRow: React.FC<BooleanRowProps> = ({
  title,
  buttonText,
  disabled,
  loading,
  onClick,
  variant,
  color
}) => {
  return (
    <SettingsRow
      title={title}
      inputComponent={
        <Button
          variant={variant}
          onClick={onClick}
          color={color}
          danger={color === 'danger'}
          disabled={disabled}
          loading={loading}
        >
          {buttonText}
        </Button>
      }
    />
  );
};

export default BooleanRow;
