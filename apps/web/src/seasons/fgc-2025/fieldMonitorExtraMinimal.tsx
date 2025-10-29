import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { FGC25FCS } from '@toa-lib/models';
import { Divider, Flex, Tag, Typography } from 'antd';
import { FC, useEffect, useState } from 'react';
import { useSocket } from 'src/api/use-socket.js';

const StatusTag = ({
  connected,
  label
}: {
  connected: boolean;
  label: string;
}) => (
  <Tag
    icon={connected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
    color={connected ? 'success' : 'error'}
    style={{ padding: '0 4px', margin: '2px' }}
  >
    {label}
  </Tag>
);

export const FieldMonitorExtraMinimal: FC = () => {
  const [socket, connected] = useSocket();
  const [fcsStatus, setFcsStatus] = useState<FGC25FCS.FcsStatus | null>(null);

  useEffect(() => {
    if (!connected || !socket) return;

    socket.on('fcs:status', handleFcsStatus);
    socket.emit('rooms', ['fcs']);

    return () => {
      socket.off('fcs:status');
    };
  }, [socket, connected]);

  const handleFcsStatus = (status: any) => {
    const parsedStatus: FGC25FCS.FcsStatus = JSON.parse(status as string); // lol?
    setFcsStatus(parsedStatus);
  };

  return fcsStatus ? (
    <Flex flex={1} vertical gap='0.5rem'>
      <Divider>Field Status</Divider>
      <Flex justify='space-between'>
        <StatusTag connected={fcsStatus.wled.blueConnected} label='Blue' />
        <StatusTag connected={fcsStatus.wled.centerConnected} label='Center' />
        <StatusTag connected={fcsStatus.wled.redConnected} label='Red' />
      </Flex>
      <Flex flex={1} justify='space-between'>
        <Typography.Text>
          {Number(fcsStatus.redDispenser.temperature).toFixed(1)} °C
        </Typography.Text>
        <Typography.Text strong>Temps</Typography.Text>
        <Typography.Text>
          {Number(fcsStatus.blueDispenser.temperature).toFixed(1)} °C
        </Typography.Text>
      </Flex>
      <Flex flex={1} justify='space-between'>
        <Typography.Text>{fcsStatus.redDispenser.unjamCount}</Typography.Text>
        <Typography.Text strong>Unjam Count</Typography.Text>
        <Typography.Text>{fcsStatus.blueDispenser.unjamCount}</Typography.Text>
      </Flex>
    </Flex>
  ) : null;
};
