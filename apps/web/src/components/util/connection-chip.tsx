import { FC } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { Button, Space, Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

export const ConnectionChip: FC<{ iconOnly?: boolean }> = ({ iconOnly }) => {
  const { connected, worker, init } = useSocketWorker();
  const label = connected ? 'Connected' : 'Not Connected';
  const chip = (
    <Tag
      icon={connected ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
      color={connected ? 'success' : 'error'}
      style={{
        fontSize: 'large',
        padding: '8px',
        ...(iconOnly && { marginInlineEnd: 0 })
      }}
    >
      {!iconOnly && label}
    </Tag>
  );
  const handleRefreshConnection = async () => {
    if (worker) {
      await worker.destroy();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await init();
    }
  };
  return (
    <Tooltip
      title={
        <Space orientation='vertical'>
          <Button type='primary' onClick={handleRefreshConnection}>
            Refresh Connection
          </Button>
        </Space>
      }
    >
      {chip}
    </Tooltip>
  );
};
