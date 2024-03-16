import { FC, useState } from 'react';
import { Button } from '@mui/material';
import LoginDialog from '../../dialogs/LoginDialog/LoginDialog';

const LoginButton: FC = () => {
  const [open, setOpen] = useState(false);

  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);

  const onSubmit = async () => {
    setOpen(false);
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
