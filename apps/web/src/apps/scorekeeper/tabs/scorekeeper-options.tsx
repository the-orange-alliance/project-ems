import { Button, Popconfirm, Space } from 'antd';
import { FC } from 'react';
import { useFieldControlOptionsItems } from '../hooks/use-production-options.js';

export const ScorekeeperOptions: FC = () => {
  const items = useFieldControlOptionsItems();

  return (
    <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
      {items.map(({ key, label, disabled, onClick, confirm }) =>
        confirm ? (
          <Popconfirm
            key={key}
            title={confirm.title}
            description={confirm.description}
            okText={confirm.okText}
            disabled={disabled}
            onConfirm={onClick}
          >
            <Button type='primary' block disabled={disabled}>
              {label}
            </Button>
          </Popconfirm>
        ) : (
          <Button
            key={key}
            type='primary'
            block
            disabled={disabled}
            onClick={onClick}
          >
            {label}
          </Button>
        )
      )}
    </Space>
  );
};
