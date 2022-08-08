import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { ChangeEvent, FC, useEffect, useCallback, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { login } from 'src/api/ApiProvider';
import { userAtom } from 'src/stores/Recoil';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (err: unknown | null) => void;
}

const LoginDialog: FC<Props> = ({ open, onClose, onSubmit }) => {
  const setUser = useSetRecoilState(userAtom);

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
  const submit = useCallback(async () => {
    try {
      const user = await login(username, password);
      setUser(user);
      onSubmit(null);
    } catch (e) {
      onSubmit(e);
    }
  }, []);

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
