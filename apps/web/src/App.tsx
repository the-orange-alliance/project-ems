import { Routes, Route } from 'react-router-dom';
import routes from './app-routes.js';
import './utils.less';
import { useSnackbar } from './hooks/use-snackbar.js';
import { FC, ReactNode, Suspense, useMemo } from 'react';
import SyncEffects from './components/sync-effects/sync-effects.js';
import PrimaryAppbar from './components/appbars/primary.js';
import { ConnectionManager } from './components/util/connection-manager.js';
import { PageLoader } from './components/loading/index.js';
import ErrorFallback from './components/errors/error-boundary.js';
import { ErrorBoundary } from 'react-error-boundary';

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

  const buildType = import.meta.env.VITE_BUILD_TYPE;

  const filteredRoutes = useMemo(
    () =>
      routes.filter((route) =>
        buildType === 'production' ? route.online === true : true
      ),
    [routes, buildType]
  );

  return (
    <>
      <AppSnackbar />
      <ConnectionManager />
      <ErrorBoundary fallbackRender={(props) => <ErrorFallback {...props} />}>
        <Routes>
          {filteredRoutes.map((route) => (
            <Route
              key={route.name}
              path={route.path}
              element={
                <RouteWrapper>
                  {!route.hideAppbar && <PrimaryAppbar />}
                  <Suspense fallback={<PageLoader />}>
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
                      <Suspense fallback={<PageLoader />}>
                        <route.element />
                      </Suspense>
                    </RouteWrapper>
                  }
                />
              ))}
            </Route>
          ))}
        </Routes>
      </ErrorBoundary>
    </>
  );
}
