import { FC, useEffect, useState } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { FGC25FCS } from '@toa-lib/models';
import { Card, Tag, Flex, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

export const StatusTag = ({
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

export const FieldMonitorExtra: FC = () => {
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
    <Card title='FCS Status' size='small' style={{ width: '100%' }}>
      <Flex vertical flex={1} gap='1rem'>
        {/* WLED */}
        <Card>
          <Flex vertical gap='0.5rem'>
            <Typography.Text>WLED</Typography.Text>
            <Flex style={{ width: '100%' }}>
              <StatusTag
                connected={fcsStatus.wled.blueConnected}
                label='Blue'
              />
              <StatusTag
                connected={fcsStatus.wled.centerConnected}
                label='Center'
              />
              <StatusTag connected={fcsStatus.wled.redConnected} label='Red' />
            </Flex>
          </Flex>
        </Card>

        {/* Dispensers */}
        <Flex justify='space-between' gap='1rem'>
          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong style={{ alignSelf: 'center' }}>
                Red Dispenser
              </Typography.Text>
              <Flex justify='space-between'>
                <span>Temp</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.redDispenser.temperature}°C
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Current</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.redDispenser.current}A
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Unjam</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.redDispenser.unjamCount}
                </span>
              </Flex>
              <Flex justify='center'>
                <StatusTag
                  connected={fcsStatus.redDispenser.indexerBeamBreak}
                  label='Beam Break'
                />
              </Flex>
            </Card>
          </Flex>

          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong style={{ alignSelf: 'center' }}>
                Blue Dispenser
              </Typography.Text>
              <Flex justify='space-between'>
                <span>Temp</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.blueDispenser.temperature}°C
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Current</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.blueDispenser.current}A
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Unjam</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.blueDispenser.unjamCount}
                </span>
              </Flex>
              <Flex justify='center'>
                <StatusTag
                  connected={fcsStatus.blueDispenser.indexerBeamBreak}
                  label='Beam Break'
                />
              </Flex>
            </Card>
          </Flex>
        </Flex>

        {/* Ecosystems */}
        <Flex justify='space-between' gap='1rem' style={{ width: '100%' }}>
          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong>Red Ecosystem</Typography.Text>
              <Flex flex={1} gap='0.5rem'>
                <StatusTag
                  connected={fcsStatus.redEcosystem.l3BeamBreak}
                  label='L3'
                />
                <StatusTag
                  connected={fcsStatus.redEcosystem.l2BeamBreak}
                  label='L2'
                />
                <StatusTag
                  connected={fcsStatus.redEcosystem.l1BeamBreak}
                  label='L1'
                />
              </Flex>
            </Card>
          </Flex>
          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong>Blue Ecosystem</Typography.Text>
              <Flex flex={1} gap='0.5rem'>
                <StatusTag
                  connected={fcsStatus.blueEcosystem.l3BeamBreak}
                  label='L3'
                />
                <StatusTag
                  connected={fcsStatus.blueEcosystem.l2BeamBreak}
                  label='L2'
                />
                <StatusTag
                  connected={fcsStatus.blueEcosystem.l1BeamBreak}
                  label='L1'
                />
              </Flex>
            </Card>
          </Flex>

          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong>Center Ecosystem</Typography.Text>
              <Flex flex={1} gap='0.5rem'>
                <StatusTag
                  connected={fcsStatus.centerEcosystem.l3BeamBreak}
                  label='L3'
                />
                <StatusTag
                  connected={fcsStatus.centerEcosystem.l2BeamBreak}
                  label='L2'
                />
                <StatusTag
                  connected={fcsStatus.centerEcosystem.l1BeamBreak}
                  label='L1'
                />
              </Flex>
            </Card>
          </Flex>
        </Flex>

        {/* Accelerators */}
        <Flex justify='space-between' gap='1rem'>
          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong style={{ alignSelf: 'center' }}>
                Red Accelerator
              </Typography.Text>
              <Flex justify='space-between'>
                <span>Velocity</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.redAccelerator.velocity}{' RPM'}
                </span>
              </Flex>
            </Card>
          </Flex>

          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong style={{ alignSelf: 'center' }}>
                Blue Accelerator
              </Typography.Text>
              <Flex justify='space-between'>
                <span>Velocity</span>
                <span style={{ fontWeight: 500 }}>
                  {fcsStatus.blueAccelerator.velocity}{' RPM'}
                </span>
              </Flex>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  ) : null;
};
