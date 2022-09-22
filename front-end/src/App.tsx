import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';
import useLocalStorage from './stores/LocalStorage';
import { useRecoilState } from 'recoil';
import { userAtom } from './stores/Recoil';
import { UserLoginResponse } from '@toa-lib/models';
import { setupSocket } from './api/SocketProvider';

function App() {
  const [user, setUser] = useRecoilState(userAtom);

  // Check for cached login
  const [value] = useLocalStorage<UserLoginResponse>('ems:user', null);

  useEffect(() => {
    if (value && !user) {
      setUser(value);
      setupSocket(value.token);
    }
  }, [user, value]);

  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.name} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export default App;
