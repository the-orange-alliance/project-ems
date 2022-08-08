import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';
import useLocalStorage from './stores/LocalStorage';
import { useSetRecoilState } from 'recoil';
import { userAtom } from './stores/Recoil';

function App() {
  const setUser = useSetRecoilState(userAtom);

  // Check for cached login
  const [value] = useLocalStorage('ems:user', null);

  useEffect(() => {
    if (value) {
      setUser(value);
    }
  }, [value]);

  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.name} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export default App;
