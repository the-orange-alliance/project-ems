import { Button, Space } from 'antd';
import { FC } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';

export const ScorekeeperOptions: FC = () => {
  const fieldControl = useSeasonFieldControl();
  const { worker } = useSocketWorker();

  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Button type='primary' block onClick={fieldControl?.clearField}>
        Force Field Green
      </Button>
      <Button type='primary' block onClick={fieldControl?.prepareField}>
        Force Prep Field
      </Button>
      <Button type='primary' block onClick={fieldControl?.awardsMode}>
        Awards Mode
      </Button>
      <Button type='primary' block onClick={() => worker?.emit('fcs:ropeDrop')}>
        Force Rope Drop (2025)
      </Button>
    </Space>
  );
};
