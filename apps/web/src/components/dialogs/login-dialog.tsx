import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { User } from '@toa-lib/models';
import { ChangeEvent, FC, useEffect, useCallback, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { login } from 'src/api/use-login-data';
import { useSocket } from 'src/api/use-socket';
import useLocalStorage from 'src/stores/local-storage';
import { userAtom } from 'src/stores/recoil';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const LoginDialog: FC<Props> = ({ open, onClose, onSubmit }) => {
  const setUser = useSetRecoilState(userAtom);
  const [, setValue] = useLocalStorage<User | null>('currentUser', null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [, , setupSocket] = useSocket();

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
  }, [open]);

  const updateUser = (event: ChangeEvent<HTMLInputElement>) =>
    setUsername(event.target.value);
  const updatePass = (event: ChangeEvent<HTMLInputElement>) =>
    setPassword(event.target.value);
  const submit = useCallback(async () => {
    try {
      const user = await login(username, password);
      setValue(user);
      setUser(user);
      setupSocket(user.token);
      onSubmit();
    } catch (e) {
      if (e instanceof Error) {
        setError(e.name);
      } else {
        setError('Error while trying to authenticate. Please try again.');
      }
    }
  }, [username, password]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs'>
      <DialogTitle
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.common.white,
          marginBottom: (theme) => theme.spacing(2)
        }}
      >
        Login
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Login using the provided username/password combination given to you by
          your event staff.
        </DialogContentText>
        {error.length > 0 && (
          <DialogContentText
            sx={{ color: (theme) => theme.palette.error.main }}
          >
            {error}
          </DialogContentText>
        )}
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
