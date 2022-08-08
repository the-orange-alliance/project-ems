import { FC } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import DrawerLayout from 'src/layouts/DrawerLayout';
import AppRoutes from 'src/AppRoutes';

const EventApp: FC = () => {
  return (
    <DrawerLayout containerWidth='md' routes={AppRoutes}>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Event Manager</Typography>
        </Box>
        <Divider />
        <Box>Content</Box>
      </Paper>
    </DrawerLayout>
  );
};

export default EventApp;
