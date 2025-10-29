import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { FGC25FCS } from '@toa-lib/models';
import { Divider, Flex, Tag, Typography } from 'antd';
import { FC } from 'react';
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

export const FieldMonitorExtraMinimal: FC<FGC25FCS.FcsStatus> = (fcsStatus) => {
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
          {Number(fcsStatus.blueDispenser.temperature).toFixed(1)} °C
        </Typography.Text>
        <Typography.Text strong>Temps</Typography.Text>
        <Typography.Text>
          {Number(fcsStatus.redDispenser.temperature).toFixed(1)} °C
        </Typography.Text>
      </Flex>
      <Flex flex={1} justify='space-between'>
        <Typography.Text>{Number(fcsStatus.blueDispenser.unjamCount).toFixed(0)}</Typography.Text>
        <Typography.Text strong>Unjam Count</Typography.Text>
        <Typography.Text>{Number(fcsStatus.redDispenser.unjamCount).toFixed(0)}</Typography.Text>
      </Flex>
    </Flex>
  ) : null;
};
