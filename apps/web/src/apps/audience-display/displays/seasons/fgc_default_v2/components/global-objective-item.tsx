import React from 'react';
import { Col, Row, Typography } from 'antd';

interface GlobalObjectiveItemProps {
  title: string;
  value: number | string;
  color: string;
}

const GlobalObjectiveItem: React.FC<GlobalObjectiveItemProps> = ({
  title,
  value,
  color
}) => (
  <div
    style={{
      backgroundColor: `${color}b0`,
      padding: '1rem',
      borderRadius: '0.75rem',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
  >
    <Row justify='space-between' align='middle'>
      <Col>
        <Typography.Text
          style={{
            fontSize: '1.5rem',
            lineHeight: '1.25rem',
            fontWeight: 300,
            color: '#a7f3d0'
          }}
        >
          {title}
        </Typography.Text>
      </Col>
      <Col>
        <Typography.Title
          level={4}
          style={{
            color: 'white',
            fontWeight: 'bold',
            margin: 0,
            fontSize: '1.5rem'
          }}
        >
          {value}
        </Typography.Title>
      </Col>
    </Row>
  </div>
);

export const GlobalObjectiveItemStream: React.FC<GlobalObjectiveItemProps> = ({
  title,
  value
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem',
      borderRadius: '0.5rem',
      backgroundColor: '#10522cca'
    }}
  >
    <Typography.Text
      style={{ color: '#a7f3d0', fontSize: '1.5rem', fontWeight: 400 }}
    >
      {title}
    </Typography.Text>
    <Typography.Text
      style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}
    >
      {value}
    </Typography.Text>
  </div>
);

export default GlobalObjectiveItem;
