import { FC } from 'react';
import { Card, Typography, Divider, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

export const MatchStatus: FC = () => {
  return (
    <Card style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 16
        }}
      >
        <Typography.Title
          level={5}
          style={{ textAlign: 'center', marginBottom: 16 }}
        >
          Match Status
        </Typography.Title>
        <Tag
          icon={<CheckCircleOutlined />}
          color='blue'
          style={{ alignSelf: 'center', marginBottom: 16 }}
        >
          Match Started
        </Tag>
      </div>
      <Divider />
      <div style={{ padding: 16 }}>
        <Typography.Text
          style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}
        >
          Match Status
        </Typography.Text>
        <Typography.Title level={2} style={{ textAlign: 'center', margin: 0 }}>
          Match Countdown
        </Typography.Title>
      </div>
    </Card>
  );
};
