import { Routes, Route } from 'react-router-dom';
import LocalStorageLoader from './components/LocalStorageLoader/LocalStorageLoader';
import routes from './AppRoutes';
import './App.less';
import { useSnackbar } from './features/hooks/use-snackbar';

function App() {
  const { AppSnackbar } = useSnackbar();

  return (
    <>
      <LocalStorageLoader />
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
