import { Box, LinearProgress } from '@mui/material';
import { FC, Suspense } from 'react';

export const PageLoader: FC = () => {
  return (
    <Suspense>
      <Box style={{ width: '100%', position: 'absolute', left: 0, top: 0 }}>
        <LinearProgress />
      </Box>
    </Suspense>
  );
};
