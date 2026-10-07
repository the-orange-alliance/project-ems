import { Flex, Typography } from 'antd';
import { FC, ReactNode } from 'react';

/** A small caption above a form control, for compact inline rows. */
export const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children
}) => (
  <Flex vertical gap={2}>
    <Typography.Text type='secondary' style={{ fontSize: 12 }}>
      {label}
    </Typography.Text>
    {children}
  </Flex>
);
