import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { FGC25FCS } from '@toa-lib/models';
import { Card, Flex, Tag, Typography } from 'antd';
import { FC } from 'react';

export type StatusType = 'success' | 'error' | 'warning';

export const StatusTag = ({
  status,
  label
}: {
  status: StatusType;
  label: string;
}) => (
  <Tag
    icon={
      status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />
    }
    color={status}
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
                status={
                  !fcsStatus.wled.blueConnected
                    ? 'error'
                    : fcsStatus.wled.blueStickyDisconnect
                      ? 'warning'
                      : 'success'
                }
                label='Blue'
              />
              <StatusTag
                status={
                  !fcsStatus.wled.centerConnected
                    ? 'error'
                    : fcsStatus.wled.centerStickyDisconnect
                      ? 'warning'
                      : 'success'
                }
                label='Center'
              />
              <StatusTag
                status={
                  !fcsStatus.wled.redConnected
                    ? 'error'
                    : fcsStatus.wled.redStickyDisconnect
                      ? 'warning'
                      : 'success'
                }
                label='Red'
              />
            </Flex>
          </Flex>
        </Card>

        {/* Dispensers */}
        <Flex justify='space-between' gap='1rem'>
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
                <span>Unjam Count</span>
                <span style={{ fontWeight: 500 }}>
                  {Number(fcsStatus.blueDispenser.unjamCount).toFixed(0)}
                </span>
              </Flex>
              <Flex justify='center'>
                <StatusTag
                  status={
                    fcsStatus.blueDispenser.indexerBeamBreak
                      ? 'success'
                      : 'error'
                  }
                  label='Beam Break'
                />
              </Flex>
            </Card>
          </Flex>

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
                <span>Unjam Count</span>
                <span style={{ fontWeight: 500 }}>
                  {Number(fcsStatus.redDispenser.unjamCount).toFixed(0)}
                </span>
              </Flex>
              <Flex justify='center'>
                <StatusTag
                  status={
                    fcsStatus.redDispenser.indexerBeamBreak
                      ? 'success'
                      : 'error'
                  }
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
              <Typography.Text strong>Blue Ecosystem</Typography.Text>
              <Flex flex={1} gap='0.5rem'>
                <StatusTag
                  status={
                    fcsStatus.blueEcosystem.l3BeamBreak ? 'success' : 'error'
                  }
                  label='L3'
                />
                <StatusTag
                  status={
                    fcsStatus.blueEcosystem.l2BeamBreak ? 'success' : 'error'
                  }
                  label='L2'
                />
                <StatusTag
                  status={
                    fcsStatus.blueEcosystem.l1BeamBreak ? 'success' : 'error'
                  }
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
                  status={
                    fcsStatus.centerEcosystem.l3BeamBreak ? 'success' : 'error'
                  }
                  label='L3'
                />
                <StatusTag
                  status={
                    fcsStatus.centerEcosystem.l2BeamBreak ? 'success' : 'error'
                  }
                  label='L2'
                />
                <StatusTag
                  status={
                    fcsStatus.centerEcosystem.l1BeamBreak ? 'success' : 'error'
                  }
                  label='L1'
                />
              </Flex>
            </Card>
          </Flex>
          <Flex vertical flex={1} gap='0.5rem'>
            <Card>
              <Typography.Text strong>Red Ecosystem</Typography.Text>
              <Flex flex={1} gap='0.5rem'>
                <StatusTag
                  status={
                    fcsStatus.redEcosystem.l3BeamBreak ? 'success' : 'error'
                  }
                  label='L3'
                />
                <StatusTag
                  status={
                    fcsStatus.redEcosystem.l2BeamBreak ? 'success' : 'error'
                  }
                  label='L2'
                />
                <StatusTag
                  status={
                    fcsStatus.redEcosystem.l1BeamBreak ? 'success' : 'error'
                  }
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
        </Flex>
      </Flex>
    </Card>
  ) : null;
};
