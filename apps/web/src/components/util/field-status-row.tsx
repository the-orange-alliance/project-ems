import { Flex, Typography } from 'antd';
import { FC, ReactNode } from 'react';

/** Label on the left, value on the right, for the Field Status sections. */
export const FieldStatusRow: FC<{ label: string; children: ReactNode }> = ({
  label,
  children
}) => (
  <Flex
    justify='space-between'
    align='center'
    gap={8}
    style={{ whiteSpace: 'nowrap' }}
  >
    <Typography.Text type='secondary'>{label}</Typography.Text>
    {children}
  </Flex>
);
