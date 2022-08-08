import { FC, useState } from 'react';
import { Button } from '@mui/material';
import LoginDialog from '../../../components/LoginDialog/LoginDialog';
import { login } from '../../../api/ApiProvider';
import { useSetRecoilState } from 'recoil';
import { userAtom } from '../../../stores/Recoil';

const LoginButton: FC = () => {
  const [open, setOpen] = useState(false);

  const setUser = useSetRecoilState(userAtom);

  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);

  const onSubmit = async (username: string, password: string) => {
    try {
      const user = await login(username, password);
      setUser(user);
      setOpen(false);
    } catch (e) {
      console.error(e);
      setOpen(false);
    }
  };

  return (
    <>
      <Button onClick={openDialog} color='inherit'>
        Login
      </Button>
      <LoginDialog open={open} onClose={closeDialog} onSubmit={onSubmit} />
    </>
  );
};

export default LoginButton;
