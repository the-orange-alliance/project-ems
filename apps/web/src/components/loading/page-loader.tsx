import { theme } from 'antd';
import { FC } from 'react';

export const PageLoader: FC = () => {
  const { token } = theme.useToken();

  return (
    <>
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
    </>
  );
};
