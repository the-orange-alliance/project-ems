import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { FGC25FCS } from '@toa-lib/models';
import { Divider, Flex, Tag, Typography } from 'antd';
import { FC } from 'react';
import { StatusTag } from './fieldMonitorExtra.js';

export const FieldMonitorExtraMinimal: FC<FGC25FCS.FcsStatus> = (fcsStatus) => {
  return fcsStatus ? (
    <Flex flex={1} vertical gap='0.5rem'>
      <Divider>Field Status</Divider>
      <Flex justify='space-between'>
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
        <Typography.Text>
          {Number(fcsStatus.blueDispenser.unjamCount).toFixed(0)}
        </Typography.Text>
        <Typography.Text strong>Unjam Count</Typography.Text>
        <Typography.Text>
          {Number(fcsStatus.redDispenser.unjamCount).toFixed(0)}
        </Typography.Text>
      </Flex>
    </Flex>
  ) : null;
};
