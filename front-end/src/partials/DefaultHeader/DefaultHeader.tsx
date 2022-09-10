import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface Props {
  title: string;
  children?: ReactNode;
}

const DefaultHeader: FC<Props> = ({ title, children }) => {
  return (
    <Paper>
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography variant='h4'>{title}</Typography>
      </Box>
      <Divider />
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>{children}</Box>
    </Paper>
  );
};

export default DefaultHeader;
