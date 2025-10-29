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

type DispenserCardProps = {
  name: string;
  status: FGC25FCS.DispenserFcsStatus;
};

const DispenserCard: FC<DispenserCardProps> = ({ name, status }) => {
  return (
    <Flex vertical flex={1} gap='0.5rem'>
      <Card>
        <Typography.Text strong style={{ alignSelf: 'center' }}>
          {name}
        </Typography.Text>
        <Flex justify='space-between'>
          <span>Temp</span>
          <span style={{ fontWeight: 500 }}>
            {Number(status.temperature).toFixed(1)}
            {' °C'}
          </span>
        </Flex>
        <Flex justify='space-between'>
          <span>Current</span>
          <span style={{ fontWeight: 500 }}>
            {Number(status.current).toFixed(1)}
            {' A'}
          </span>
        </Flex>
        <Flex justify='space-between'>
          <span>Unjam Count</span>
          <span style={{ fontWeight: 500 }}>
            {Number(status.unjamCount).toFixed(0)}
          </span>
        </Flex>
        <Flex justify='center'>
          <StatusTag
            status={status.indexerBeamBreak ? 'success' : 'error'}
            label='Beam Break'
          />
        </Flex>
      </Card>
    </Flex>
  );
};

type EcosystemCardProps = {
  name: string;
  status: FGC25FCS.EcosystemFcsStatus;
};

const EcosystemCard: FC<EcosystemCardProps> = ({ name, status }) => {
  return (
    <Flex vertical flex={1} gap='0.5rem'>
      <Card>
        <Typography.Text strong>{name}</Typography.Text>
        <Flex flex={1} gap='0.5rem'>
          <StatusTag
            status={status.l3BeamBreak ? 'success' : 'error'}
            label='L3'
          />
          <StatusTag
            status={status.l2BeamBreak ? 'success' : 'error'}
            label='L2'
          />
          <StatusTag
            status={status.l1BeamBreak ? 'success' : 'error'}
            label='L1'
          />
        </Flex>
        <Flex justify='space-between'>
          <span>Force Level Count</span>
          <span style={{ fontWeight: 500 }}>
            {Number(status.forceCount).toFixed(0)}
          </span>
        </Flex>
      </Card>
    </Flex>
  );
};

type AcceleratorCardProps = {
  name: string;
  status: FGC25FCS.AcceleratorFcsStatus;
};

const AcceleratorCard: FC<AcceleratorCardProps> = ({ name, status }) => {
  return (
    <Flex vertical flex={1} gap='0.5rem'>
      <Card>
        <Typography.Text strong style={{ alignSelf: 'center' }}>
          {name}
        </Typography.Text>
        <Flex justify='space-between'>
          <span>Velocity</span>
          <span style={{ fontWeight: 500 }}>
            {Number(status.velocity).toFixed(1)}
            {' RPM'}
          </span>
        </Flex>
      </Card>
    </Flex>
  );
};

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
          <DispenserCard
            name='Blue Dispenser'
            status={fcsStatus.blueDispenser}
          />
          <DispenserCard name='Red Dispenser' status={fcsStatus.redDispenser} />
        </Flex>

        {/* Ecosystems */}
        <Flex justify='space-between' gap='1rem' style={{ width: '100%' }}>
          <EcosystemCard
            name='Blue Ecosystem'
            status={fcsStatus.blueEcosystem}
          />
          <EcosystemCard
            name='Center Ecosystem'
            status={fcsStatus.centerEcosystem}
          />
          <EcosystemCard name='Red Ecosystem' status={fcsStatus.redEcosystem} />
        </Flex>

        {/* Accelerators */}
        <Flex justify='space-between' gap='1rem'>
          <AcceleratorCard
            name='Blue Accelerator'
            status={fcsStatus.blueAccelerator}
          />
          <AcceleratorCard
            name='Red Accelerator'
            status={fcsStatus.redAccelerator}
          />
        </Flex>
      </Flex>
    </Card>
  ) : null;
};
