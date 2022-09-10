import { Box, LinearProgress } from '@mui/material';
import { FC } from 'react';

const Fallback: FC = () => {
  return (
    <Box
      sx={{
        marginTop: '-16px',
        background: '#000000',
        minHeight: '100%',
        minWidth: '100%'
      }}
    >
      <LinearProgress />
    </Box>
  );
};

export default Fallback;
