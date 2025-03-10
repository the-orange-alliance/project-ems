import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';

interface Props {
  left: ReactNode;
  right: ReactNode;
}

export const TwoColumnHeader: FC<Props> = ({ left, right }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignContent: 'center'
      }}
    >
      {left}
      {right}
    </Box>
  );
};
