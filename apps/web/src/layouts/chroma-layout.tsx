import { FC, ReactNode } from 'react';
import { Typography } from 'antd';
import { useAtomValue } from 'jotai';
import { displayChromaKeyAtom } from 'src/stores/state/audience-display.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  const chromaKey = useAtomValue(displayChromaKeyAtom);
  const { connected } = useSocketWorker();
  return (
    <div>
      {!connected && (
        <Typography.Title
          level={5}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            textAlign: 'center',
            color: 'black',
            fontWeight: 'bold',
            WebkitTextStroke: '.5px white'
          }}
        >
          Socket Not Connected!
        </Typography.Title>
      )}
      <style>
        {`
          body {
            background: ${
              chromaKey
                ? chromaKey.startsWith('#')
                  ? chromaKey
                  : `#${chromaKey}`
                : '#00000000'
            };
          }
        `}
      </style>
      <div
        style={{
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
};
