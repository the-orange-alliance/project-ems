import { Routes, Route } from 'react-router-dom';
import LocalStorageLoader from './components/LocalStorageLoader/LocalStorageLoader';
import routes from './AppRoutes';
import './App.less';

function App() {
  return (
    <>
      <LocalStorageLoader />
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
