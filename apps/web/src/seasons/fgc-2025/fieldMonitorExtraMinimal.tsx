import { FC, useEffect, useState } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { FGC25FCS } from '@toa-lib/models';
import { Card, Tag, Flex, Typography, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

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
    // TODO(jan): Use actual socket data
    setFcsStatus({
      wled: {
        redConnected: true,
        blueConnected: true,
        centerConnected: false
      },
      redDispenser: {
        temperature: 72.5,
        current: 2.3,
        unjamCount: 5,
        indexerBeamBreak: true
      },
      blueDispenser: {
        temperature: 71.8,
        current: 2.1,
        unjamCount: 3,
        indexerBeamBreak: false
      },
      redEcosystem: {
        l3BeamBreak: true,
        l2BeamBreak: false,
        l1BeamBreak: true
      },
      blueEcosystem: {
        l3BeamBreak: false,
        l2BeamBreak: true,
        l1BeamBreak: false
      },
      centerEcosystem: {
        l3BeamBreak: true,
        l2BeamBreak: true,
        l1BeamBreak: true
      },
      redAccelerator: {
        velocity: 45.6
      },
      blueAccelerator: {
        velocity: 47.2
      }
    });

    if (!connected || !socket) return;

    socket.on('fcs:status', handleFcsStatus);
    socket.emit('rooms', ['fcs']);

    return () => {
      socket.off('fcs:status');
    };
  }, []);

  const handleFcsStatus = (status: FGC25FCS.FcsStatus) => {
    setFcsStatus(status);
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
          {fcsStatus.redDispenser.temperature} °C
        </Typography.Text>
        <Typography.Text strong>Temps</Typography.Text>
        <Typography.Text>
          {fcsStatus.blueDispenser.temperature} °C
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
