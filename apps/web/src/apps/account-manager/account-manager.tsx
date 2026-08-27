import { Button, Card, Divider, Space, Typography } from 'antd';
import { FC } from 'react';
import { setupDefaultAccounts } from 'src/api/use-event-data.js';
import { useUsers } from 'src/api/use-login-data.js';
import { DefaultLayout } from '@layouts/default-layout.js';

const AccountManager: FC = () => {
  const { data: users, error } = useUsers();

  const setup = async (): Promise<void> => {
    await setupDefaultAccounts();
  };

  return (
    <DefaultLayout containerWidth='md'>
      <Card>
        <Typography.Title level={4}>Account Manager</Typography.Title>
        <Divider />
        <Space direction='vertical'>
          {users && users.length > 0 && !error && (
            <Typography.Text>{JSON.stringify(users)}</Typography.Text>
          )}
          {users && users.length <= 0 && !error && (
            <>
              <Typography.Text>
                There are currently no active accounts. Please create default
                accounts.
              </Typography.Text>
              <Button type='primary' onClick={setup}>
                Create Default Accounts
              </Button>
            </>
          )}
          {!users && error && (
            <>
              <Typography.Text>
                There are currently no active accounts. Please create default
                accounts.
              </Typography.Text>
              <Button type='primary' onClick={setup}>
                Create Default Accounts
              </Button>
            </>
          )}
        </Space>
      </Card>
    </DefaultLayout>
  );
};

export default AccountManager;
