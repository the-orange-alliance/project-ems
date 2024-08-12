import { FC, ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  return (
    <Box>
      <Box>{children}</Box>
    </Box>
  );
};
