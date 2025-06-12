import { FC, JSX, Suspense, useEffect } from 'react';
import { Layout, Card, Divider, theme, Typography } from 'antd';
import { appbarConfigAtom } from '@stores/state/index.js';
import { useSetAtom } from 'jotai';

interface Props {
  title?: string;
  titleLink?: string;
  header?: JSX.Element | string;
  containerWidth?: number | string;
  children?: JSX.Element | JSX.Element[];
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
    if (title || titleLink || showSettings) {
      updateAppbarConfig({ title, titleLink, showSettings });
    }
  }, [title, titleLink]);

  return (
    <Layout
      style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px', minHeight: 'calc(100% - 56px)' }}
    >
      <Content
        style={{ maxWidth: containerWidth, width: '100%', padding: '0 16px' }}
      >
        <Card>
          {header && typeof header === "string" && (
            <>
              <Typography.Title level={2} style={{margin: '0.5em 0'}}>{header}</Typography.Title>
              <Divider />
            </>
          )}
          {header && typeof header !== "string" && (
            <>
              {header}
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
