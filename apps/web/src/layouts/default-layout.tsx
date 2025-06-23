import { FC, useEffect } from 'react';
import { Layout } from 'antd';
import { appbarConfigAtom } from '@stores/state/index.js';
import { useSetAtom } from 'jotai';

interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: number | string;
  children?: JSX.Element | JSX.Element[] | string;
}

const { Content } = Layout;

export const DefaultLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth = '100%',
  children
}: Props) => {
  const updateAppbarConfig = useSetAtom(appbarConfigAtom);

  useEffect(() => {
    if (title || titleLink) {
      updateAppbarConfig({ title, titleLink });
    }
  }, [title, titleLink]);

  return (
    <Layout
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '40px',
        height: 'calc(100% - 40px - 16px)'
      }}
    >
      <Content
        style={{
          maxWidth: containerWidth,
          width: '100%',
          padding: '0 16px'
        }}
      >
        {children}
      </Content>
    </Layout>
  );
};
