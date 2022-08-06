import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';
import { useEffect } from 'react';
import { login } from './api/ApiProvider';

function App() {
  useEffect(() => {
    void login('admin', 'password');
  });

  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.name} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export default App;
