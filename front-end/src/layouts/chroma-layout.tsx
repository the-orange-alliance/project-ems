import { FC, ReactNode } from 'react';
import { Box, CssBaseline } from '@mui/material';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  return (
    <Box>
      <CssBaseline />
      <Box>{children}</Box>
    </Box>
  );
};
