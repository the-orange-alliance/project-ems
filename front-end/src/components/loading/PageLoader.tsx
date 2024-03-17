import { Box, LinearProgress } from '@mui/material';
import { FC } from 'react';

export const PageLoader: FC = () => {
  return (
    <Box style={{ width: '100%', position: 'absolute', left: 0, top: 0 }}>
      <LinearProgress />
    </Box>
  );
};
