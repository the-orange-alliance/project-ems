import { FC, ReactNode, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { appbarConfigAtom } from 'src/stores/state/ui.js';
import { Layout, Row, Col } from 'antd';

interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: string | false;
  children?: ReactNode;
}

export const RefereeLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth,
  children
}) => {
  const setAppbarConfig = useSetAtom(appbarConfigAtom);

  useEffect(() => {
    setAppbarConfig({
      title,
      titleLink,
      showFullscreen: true
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex' }}>
      <Row justify='center' style={{ marginTop: 96 }}>
        <Col
          span={24}
          style={{
            maxWidth:
              containerWidth === false ? '100%' : containerWidth || 1200,
            width: '100%'
          }}
        >
          {children}
        </Col>
      </Row>
    </Layout>
  );
};
