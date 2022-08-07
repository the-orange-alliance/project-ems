import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';
import { useEffect } from 'react';
import { login } from './api/ApiProvider';

function App() {
  const loginUser = async () => {
    const test = await login('admin', 'password');
    console.log(test);
  };

  useEffect(() => {
    void loginUser();
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
