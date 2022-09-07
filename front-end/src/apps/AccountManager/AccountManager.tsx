import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import { setupDefaultAccounts, useUsers } from 'src/api/ApiProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';

const AccountManager: FC = () => {
  const { data: users, error } = useUsers();

  const setup = async (): Promise<void> => {
    await setupDefaultAccounts();
  };

  return (
    <DefaultLayout containerWidth='md'>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Account Manager</Typography>
        </Box>
        <Divider />
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          {users && users.length > 0 && !error && (
            <Typography>{JSON.stringify(users)}</Typography>
          )}
          {users && users.length <= 0 && !error && (
            <>
              <Typography>
                There are currently no active accounts. Please create default
                accounts.
              </Typography>
              <Button variant='contained' onClick={setup}>
                Create Default Accounts
              </Button>
            </>
          )}
          {!users && error && (
            <>
              <Typography>
                There are currently no active accounts. Please create default
                accounts.
              </Typography>
              <Button variant='contained' onClick={setup}>
                Create Default Accounts
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default AccountManager;
