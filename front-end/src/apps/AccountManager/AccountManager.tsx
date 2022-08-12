import { Box, Divider, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import { useUsers } from 'src/api/ApiProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';

const AccountManager: FC = () => {
  const { data: users, error } = useUsers();

  return (
    <DefaultLayout containerWidth='md'>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Account Manager</Typography>
        </Box>
        <Divider />
        {users && users.length > 0 && !error && (
          <Box sx={{ padding: (theme) => theme.spacing(2) }}>
            {JSON.stringify(users)}
          </Box>
        )}
        {users && users.length <= 0 && !error && (
          <Box sx={{ padding: (theme) => theme.spacing(2) }}>
            There are currently no active accounts. Please create default
            accounts.
          </Box>
        )}
        {!users && error && (
          <Box sx={{ padding: (theme) => theme.spacing(2) }}>
            {error.message}
          </Box>
        )}
      </Paper>
    </DefaultLayout>
  );
};

export default AccountManager;
