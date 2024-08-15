import { FC, ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  return (
    <Box>
      {/* because mui is dumb */}
      <style>
        {`
          body {
            background: #00000000
          }
        `}
      </style>
      <Box
        // because I suck at css
        sx={{
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
