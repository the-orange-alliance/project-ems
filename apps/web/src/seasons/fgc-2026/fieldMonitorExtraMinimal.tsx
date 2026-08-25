import { FGC26FCS } from '@toa-lib/models';
import { Divider, Flex, Typography } from 'antd';
import { FC } from 'react';

export const FieldMonitorExtraMinimal: FC<FGC26FCS.FcsStatus> = () => {
  return (
    <Flex flex={1} vertical gap='0.5rem'>
      <Divider>Field Status</Divider>
      <Typography.Text type='secondary'>
        Field hardware not yet implemented for 2026.
      </Typography.Text>
    </Flex>
  );
};
