import { FGC26FCS } from '@toa-lib/models';
import { Card, Flex, Typography } from 'antd';
import { FC } from 'react';
import { StatusTag, StatusType } from '../fgc-2025/fieldMonitorExtra.js';

/**
 * Red: not connected now. Yellow: dropped at some point since the last
 * Clear Status. Green: connected the whole time.
 */
export const getWledStatus = (
  connected?: boolean,
  stickyDisconnect?: boolean
): StatusType =>
  !connected ? 'error' : stickyDisconnect ? 'warning' : 'success';

/** False for fields that send no WLED state, or another season's format */
export const isWledReported = (
  wled?: Partial<FGC26FCS.WledFcsStatus>
): wled is FGC26FCS.WledFcsStatus => typeof wled?.goalConnected === 'boolean';

export const FieldMonitorExtra: FC<FGC26FCS.FcsStatus> = ({ wled }) => {
  return isWledReported(wled) ? (
    <Flex vertical flex={1}>
      <Card size='small' style={{ width: '100%' }}>
        <Flex vertical gap='0.5rem'>
          <Typography.Text>WLED</Typography.Text>
          <Flex>
            <StatusTag
              status={getWledStatus(
                wled.goalConnected,
                wled.goalStickyDisconnect
              )}
              label='Goal'
            />
          </Flex>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            Yellow means the LEDs dropped since the last Clear Status.
          </Typography.Text>
        </Flex>
      </Card>
    </Flex>
  ) : null;
};
