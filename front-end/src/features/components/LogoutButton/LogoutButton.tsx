import { Button } from '@mui/material';
import { User } from '@toa-lib/models';
import { FC } from 'react';
import { useSetRecoilState } from 'recoil';
import { logout } from 'src/api/ApiProvider';
import useLocalStorage from 'src/stores/LocalStorage';
import { userAtom } from 'src/stores/NewRecoil';

const LogoutButton: FC = () => {
  const setUser = useSetRecoilState(userAtom);
  const [, setValue] = useLocalStorage<User | null>('ems:user', null);

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

export default LogoutButton;
