import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { FGC25FCS } from '@toa-lib/models';
import { Card, Flex, Tag, Typography } from 'antd';
import { FC } from 'react';

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

export const FieldMonitorExtra: FC<FGC25FCS.FcsStatus> = (fcsStatus) => {
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
                  {Number(fcsStatus.redDispenser.temperature).toFixed(1)}
                  {' °C'}
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Current</span>
                <span style={{ fontWeight: 500 }}>
                  {Number(fcsStatus.redDispenser.current).toFixed(1)}
                  {' A'}
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Unjam</span>
                <span style={{ fontWeight: 500 }}>
                  {Number(fcsStatus.redDispenser.unjamCount).toFixed(1)}
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
                  {Number(fcsStatus.blueDispenser.temperature).toFixed(1)}
                  {' °C'}
                </span>
              </Flex>
              <Flex justify='space-between'>
                <span>Current</span>
                <span style={{ fontWeight: 500 }}>
                  {Number(fcsStatus.blueDispenser.current).toFixed(1)}
                  {' A'}
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
                  {Number(fcsStatus.redAccelerator.velocity).toFixed(1)}
                  {' RPM'}
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
                  {Number(fcsStatus.blueAccelerator.velocity).toFixed(1)}
                  {' RPM'}
                </span>
              </Flex>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  ) : null;
};
