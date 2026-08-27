import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { Typography } from 'antd';
import { HardwareInfo, PrestartState } from '@toa-lib/models';

export const PrestartStatus = ({ hw }: { hw: HardwareInfo }) => {
  return (
    <div title={hw.lastLog ?? ''}>
      {hw.state === PrestartState.Prestarting ? <LoadingOutlined /> : null}
      {hw.state === PrestartState.Success ? (
        <CheckCircleOutlined style={{ color: 'green' }} />
      ) : null}
      {hw.state === PrestartState.Fail ? (
        <CloseCircleOutlined style={{ color: 'red' }} />
      ) : null}
      {hw.state === PrestartState.NotReady ? (
        <PauseCircleOutlined style={{ color: 'red' }} />
      ) : null}
      <br />
      <Typography.Text type='secondary'>{hw.name}</Typography.Text>
    </div>
  );
};
