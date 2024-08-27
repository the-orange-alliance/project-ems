import { FC, ReactNode } from 'react';
import { Box } from '@mui/material';
import { useRecoilValue } from 'recoil';
import { displayChromaKeyAtom } from 'src/stores/recoil';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  const chromaKey = useRecoilValue(displayChromaKeyAtom);
  return (
    <Box>
      {/* because mui is dumb */}
      <style>
        {`
          body {
            background: ${chromaKey}
          }
        `}
      </style>
      <Box
        // because I suck at css
        sx={{
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
