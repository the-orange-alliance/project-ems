import { FC, useState } from 'react';
import { Button } from 'antd';
import { LoginDialog } from '../dialogs/login-dialog.js';

export const LoginButton: FC = () => {
  const [open, setOpen] = useState(false);

  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);

  const onSubmit = async () => {
    setOpen(false);
  };

  return (
    <>
      <Button onClick={openDialog} size='large'>
        Login
      </Button>
      <LoginDialog open={open} onClose={closeDialog} onSubmit={onSubmit} />
    </>
  );
};
