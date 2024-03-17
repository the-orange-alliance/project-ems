import { Routes, Route } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import routes from './AppRoutes';
import './App.less';
import { useSnackbar } from './hooks/use-snackbar';
import { userAtom } from './stores/NewRecoil';
import { FC, ReactNode, useEffect } from 'react';
import { useSocket } from './api/SocketProvider';
import SyncEffects from './components/sync-effects/SyncEffects';

const RouteWrapper: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <>
      <SyncEffects />
      {children}
    </>
  );
};

function App() {
  const { AppSnackbar } = useSnackbar();
  const user = useRecoilValue(userAtom);
  const [, , setupSocket] = useSocket();

  useEffect(() => {
    // TODO: Reenable for auth
    // if (user && (user as any).token) {
    //  setupSocket((user as any).token);
    // }
    setupSocket('kyle is cool');
  }, [user]);

  return (
    <>
      <AppSnackbar />
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.name}
            path={route.path}
            element={
              <RouteWrapper>
                <route.element />
              </RouteWrapper>
            }
          >
            {route.routes?.map((subRoute) => (
              <Route
                key={subRoute.name}
                path={subRoute.path}
                element={
                  <RouteWrapper>
                    <route.element />
                  </RouteWrapper>
                }
              />
            ))}
          </Route>
        ))}
      </Routes>
    </>
  );
}

export default App;
