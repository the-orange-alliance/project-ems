import { Routes, Route } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import routes from './AppRoutes';
import './App.less';
import { useSnackbar } from './features/hooks/use-snackbar';
import { userAtom } from './stores/NewRecoil';
import { useEffect } from 'react';
import { useSocket } from './api/SocketProvider';

function App() {
  const { AppSnackbar } = useSnackbar();
  const user = useRecoilValue(userAtom);
  const [, , setupSocket] = useSocket();

  useEffect(() => {
    if (user && (user as any).token) {
      setupSocket((user as any).token);
    }
  }, [user]);

  return (
    <>
      <AppSnackbar />
      <Routes>
        {routes.map((route) => (
          <Route key={route.name} path={route.path} element={route.element}>
            {route.routes?.map((subRoute) => (
              <Route
                key={subRoute.name}
                path={subRoute.path}
                element={subRoute.element}
              />
            ))}
          </Route>
        ))}
      </Routes>
    </>
  );
}

export default App;
