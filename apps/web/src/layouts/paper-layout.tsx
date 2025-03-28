import { FC, JSX, Suspense, useEffect } from 'react';
import { Layout, Card, Divider, theme } from 'antd';
import { appbarConfigAtom } from '@stores/state/index.js';
import { useSetAtom } from 'jotai';

interface Props {
  title?: string;
  titleLink?: string;
  header?: JSX.Element | string;
  containerWidth?: number | string;
  children?: JSX.Element;
  padding?: boolean;
  showSettings?: boolean;
}

const { Content } = Layout;

export const PaperLayout: FC<Props> = ({
  title,
  titleLink,
  header,
  containerWidth = '100%',
  children,
  padding,
  showSettings
}: Props) => {
  const updateAppbarConfig = useSetAtom(appbarConfigAtom);

  useEffect(() => {
    updateAppbarConfig({
      title,
      titleLink,
      showSettings: showSettings
    });
  }, []);

  return (
    <Layout
      style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px' }}
    >
      <Content
        style={{ maxWidth: containerWidth, width: '100%', padding: '0 16px' }}
      >
        <Card>
          {header && (
            <>
              <div>{header}</div>
              <Divider />
            </>
          )}
          <div
            style={{ padding: padding ? '16px' : '0', position: 'relative' }}
          >
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};
