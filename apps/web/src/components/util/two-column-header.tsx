import { FC, ReactNode } from 'react';
import { Row, Col } from 'antd';

interface Props {
  left: JSX.Element;
  right: JSX.Element;
}

export const TwoColumnHeader: FC<Props> = ({ left, right }) => {
  return (
    <Row justify='space-between' align='middle'>
      <Col>{left}</Col>
      <Col>{right}</Col>
    </Row>
  );
};
