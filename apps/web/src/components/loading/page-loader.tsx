import { Layout, Spin, Typography, theme } from 'antd';
import { FC } from 'react';

/**
 * Suspense / route fallback. Renders a clearly-visible centered spinner (not
 * just a near-invisible top bar over an otherwise blank dark panel) plus the
 * original animated progress bar.
 */
export const PageLoader: FC<{ tip?: string }> = ({ tip = 'Loading…' }) => {
  const { token } = theme.useToken();

  return (
    <Layout style={{ height: '100%', background: 'transparent' }}>
      <div
        style={{
          left: 0,
          width: '100%',
          height: 4,
          zIndex: 1100,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `linear-gradient(90deg, transparent, ${token.colorErrorActive}, transparent)`,
            animation: 'muiLoadingBar 1s linear infinite'
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24
        }}
      >
        <Spin size='large' />
        <Typography.Text type='secondary'>{tip}</Typography.Text>
      </div>
      <style>
        {`
          @keyframes muiLoadingBar {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(0%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}
      </style>
    </Layout>
  );
};
