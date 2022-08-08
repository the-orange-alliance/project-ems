import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { ChangeEvent, FC, useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (username: string, password: string) => void;
}

const LoginDialog: FC<Props> = ({ open, onClose, onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setUsername('');
    setPassword('');
  }, [open]);

  const updateUser = (event: ChangeEvent<HTMLInputElement>) =>
    setUsername(event.target.value);
  const updatePass = (event: ChangeEvent<HTMLInputElement>) =>
    setPassword(event.target.value);
  const submit = () => onSubmit(username, password);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs'>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Login using the provided username/password combination given to you by
          your event staff.
        </DialogContentText>
        <TextField
          name='username'
          type='text'
          label='Username'
          autoFocus
          fullWidth
          margin='dense'
          variant='standard'
          value={username}
          onChange={updateUser}
        />
        <TextField
          name='password'
          type='password'
          label='Password'
          autoFocus
          fullWidth
          margin='dense'
          variant='standard'
          value={password}
          onChange={updatePass}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Login</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
