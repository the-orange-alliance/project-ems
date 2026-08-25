import { User } from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import { userAtom } from 'src/stores/state/ui.js';
import { ChangeEvent, FC, useEffect, useCallback, useState } from 'react';
import { login } from 'src/api/use-login-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import useLocalStorage from 'src/stores/local-storage.js';
import { Form, Input, Modal, Space, Typography } from 'antd';
import { SocketOptions } from '@toa-lib/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

type FieldType = {
  username?: string;
  password?: string;
};

export const LoginDialog: FC<Props> = ({ open, onSubmit }) => {
  const setUser = useSetAtom(userAtom);
  const [, setValue] = useLocalStorage<User | null>('currentUser', null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { worker } = useSocketWorker();

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
    setLoading(false);
  }, [open]);

  const updateUser = (event: ChangeEvent<HTMLInputElement>) =>
    setUsername(event.target.value);
  const updatePass = (event: ChangeEvent<HTMLInputElement>) =>
    setPassword(event.target.value);
  const submit = useCallback(async () => {
    try {
      setLoading(true);
      const user = await login(username, password);
      setValue(user);
      setUser(user);
      worker?.initialize(user.token, {
        host: SocketOptions.host,
        port: SocketOptions.port
      });
      onSubmit();
      setLoading(false);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.name);
        setLoading(false);
      } else {
        setError('Error while trying to authenticate. Please try again.');
        setLoading(false);
      }
    }
  }, [username, password]);

  const dialogKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        submit();
      }
    },
    [submit]
  );

  return (
    <Modal
      open={open}
      title='Login'
      okText='Login'
      onOk={submit}
      confirmLoading={loading}
    >
      <Space
        direction='vertical'
        size='large'
        style={{ width: '100%' }}
        onKeyUp={dialogKeyUp}
      >
        <Typography.Text>
          Login using the provided username/password combination given to you by
          your event staff.
        </Typography.Text>
        {error.length > 0 && (
          <Typography.Text type='danger'>{error}</Typography.Text>
        )}
        <Form
          name='basic'
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
          autoComplete='off'
          disabled={loading}
        >
          <Form.Item<FieldType>
            label='Username'
            name='username'
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input value={username} onChange={updateUser} />
          </Form.Item>

          <Form.Item<FieldType>
            label='Password'
            name='password'
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password value={password} onChange={updatePass} />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};
