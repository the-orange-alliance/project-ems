import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import { purgeAll } from 'src/api/ApiProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { purgeFlags } from 'src/stores/AppFlags';

const AdminApp: FC = () => {
  const handlePurge = async (): Promise<void> => {
    try {
      await purgeAll();
      await purgeFlags();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <DefaultLayout>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Account Manager</Typography>
        </Box>
        <Divider />
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Button variant='contained' color='error' onClick={handlePurge}>
            Purge Event Data
          </Button>
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default AdminApp;
