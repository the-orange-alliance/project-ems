
import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Button } from 'antd';

export const AllianceCards: FC = () => {
  const buttonConfigs = [
    {
      to: './red',
      className: 'red-bg-imp',
      style: { height: '8em' },
      label: 'Red Alliance'
    },
    {
      to: './blue',
      className: 'blue-bg-imp',
      style: { height: '8em' },
      label: 'Blue Alliance'
    },
    {
      to: './head',
      className: 'yellow-bg-imp',
      style: { height: '8em' },
      label: 'Head Referee'
    },
    {
      to: './head-min',
      className: 'purple-bg-imp',
      style: { height: '8em', backgroundColor: 'purple' },
      label: 'Head Ref Minimal'
    }
  ];

  return (
    <Row gutter={[16, 16]} style={{ flexDirection: 'column', justifyContent: 'center', margin: '0 20px' }}>
      {buttonConfigs.map(({ to, className, style, label }, idx) => (
        <Col span={24} key={to}>
          <Link to={to} style={{ width: '100%' }}>
            <Button
              block
              type='primary'
              className={className}
              style={style}
            >
              {label}
            </Button>
          </Link>
        </Col>
      ))}
    </Row>
  );
};
