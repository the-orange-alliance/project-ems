import { FC } from 'react';
import { Card, Typography } from 'antd';

export const Settings: FC = () => {
  return (
    <Card>
      <Typography.Title level={5}>
        Igniting Innovation Field Settings
      </Typography.Title>
      <Typography.Text type='secondary'>
        Field hardware and calibration settings for the 2026 season have not
        been implemented yet, since the physical field control system for
        Igniting Innovation has not been designed.
      </Typography.Text>
    </Card>
  );
};
