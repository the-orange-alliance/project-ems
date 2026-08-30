import { Button, Space } from 'antd';
import { FC } from 'react';
import { useFieldControlOptionsItems } from '../hooks/use-production-options.js';

export const ScorekeeperOptions: FC = () => {
  const items = useFieldControlOptionsItems();

  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      {items.map(({ key, label, disabled, onClick }) => (
        <Button key={key} type='primary' block disabled={disabled} onClick={onClick}>
          {label}
        </Button>
      ))}
    </Space>
  );
};
