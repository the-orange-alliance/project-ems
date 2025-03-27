import { Routes, Route } from 'react-router-dom';
import routes from './app-routes.js';
import './utils.less';
import { useSnackbar } from './hooks/use-snackbar.js';
import { FC, ReactNode, Suspense } from 'react';
import SyncEffects from './components/sync-effects/sync-effects.js';
import PrimaryAppbar from './components/appbars/primary.js';
import { LinearProgress } from '@mui/material';
import { ConnectionManager } from './components/util/connection-manager.js';

const RouteWrapper: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <>
      <SyncEffects />
      {children}
    </>
  );
};

export function AppContainer() {
  const { AppSnackbar } = useSnackbar();
  return (
    <>
      <AppSnackbar />
      <ConnectionManager />
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.name}
            path={route.path}
            element={
              <RouteWrapper>
                {!route.hideAppbar && <PrimaryAppbar />}
                <Suspense fallback={<LinearProgress color='secondary' />}>
                  <route.element />
                </Suspense>
              </RouteWrapper>
            }
          >
            {route.routes?.map((subRoute) => (
              <Route
                key={subRoute.name}
                path={subRoute.path}
                element={
                  <RouteWrapper>
                    {!route.hideAppbar && <PrimaryAppbar />}
                    <Suspense fallback={<LinearProgress color='secondary' />}>
                      <route.element />
                    </Suspense>
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
