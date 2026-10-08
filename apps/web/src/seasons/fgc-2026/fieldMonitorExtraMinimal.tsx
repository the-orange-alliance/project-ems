import { FGC26FCS } from '@toa-lib/models';
import { Divider, Flex } from 'antd';
import { FC } from 'react';
import { StatusTag } from '../fgc-2025/fieldMonitorExtra.js';
import { getWledStatus, isWledReported } from './fieldMonitorExtra.js';

export const FieldMonitorExtraMinimal: FC<FGC26FCS.FcsStatus> = ({ wled }) => {
  return isWledReported(wled) ? (
    <Flex flex={1} vertical gap='0.5rem'>
      <Divider>Field Status</Divider>
      <Flex justify='center'>
        <StatusTag
          status={getWledStatus(wled.goalConnected, wled.goalStickyDisconnect)}
          label='Goal LEDs'
        />
      </Flex>
    </Flex>
  ) : null;
};
