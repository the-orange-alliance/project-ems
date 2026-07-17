import { FGC26FCS } from '@toa-lib/models';
import { Card, Divider, Flex, Typography } from 'antd';
import { FC } from 'react';

export const FieldMonitorExtra: FC<FGC26FCS.FcsStatus> = () => {
  return (
    <Flex vertical flex={1}>
      <Divider>Field Status</Divider>
      <Card size='small' style={{ width: '100%' }}>
        <Typography.Text type='secondary'>
          Field hardware is not yet implemented for the 2026 Igniting
          Innovation season.
        </Typography.Text>
      </Card>
    </Flex>
  );
};
