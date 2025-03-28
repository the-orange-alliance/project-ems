import { theme } from 'antd';
import { FC, Suspense } from 'react';

export const PageLoader: FC = () => {
  const { token } = theme.useToken();
  return (
    <Suspense>
      <div style={{ width: '100%', position: 'absolute', left: 0, top: 0 }}>
        <div
          style={{
            height: '4px',
            background: token.colorPrimary,
            animation: 'loadingAnimation 1.5s infinite linear'
          }}
        ></div>
      </div>
      <style>
        {`
          @keyframes loadingAnimation {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </Suspense>
  );
};
