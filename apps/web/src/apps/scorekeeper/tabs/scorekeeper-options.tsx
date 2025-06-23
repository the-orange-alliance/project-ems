import { Button, Space } from 'antd';
import { FC } from 'react';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';

export const ScorekeeperOptions: FC = () => {
  const fieldControl = useSeasonFieldControl();

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
    </Space>
  );
};
