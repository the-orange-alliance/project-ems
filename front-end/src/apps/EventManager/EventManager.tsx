import { FC } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import DrawerLayout from 'src/layouts/DrawerLayout';
import AppRoutes from 'src/AppRoutes';
import { Button } from '@mui/material';
import { setupEventBase, useEvent } from 'src/api/ApiProvider';

const EventApp: FC = () => {
  const { data, error } = useEvent();

  const setup = async (): Promise<void> => {
    await setupEventBase();
  };

  return (
    <DrawerLayout containerWidth='md' routes={AppRoutes}>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Event Manager</Typography>
        </Box>
        <Divider />
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          {error && (
            <Button variant='contained' onClick={setup}>
              Create Event Database
            </Button>
          )}
          {data && <Typography>Event does exist</Typography>}
        </Box>
      </Paper>
    </DrawerLayout>
  );
};

export default EventApp;
