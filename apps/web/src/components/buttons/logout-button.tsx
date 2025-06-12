import { Button } from '@mui/material';
import { User } from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { logout } from 'src/api/use-login-data.js';
import useLocalStorage from 'src/stores/local-storage.js';
import { userAtom } from 'src/stores/state/ui.js';

export const LogoutButton: FC = () => {
  const setUser = useSetAtom(userAtom);
  const [, setValue] = useLocalStorage<User | null>('currentUser', null);

  const handle = async () => {
    try {
      await logout();
      setUser(null);
      setValue(null);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Button onClick={handle} color='inherit'>
      Logout
    </Button>
  );
};
