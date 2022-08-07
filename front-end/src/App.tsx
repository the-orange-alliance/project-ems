import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';
import { useEffect } from 'react';
import { login } from './api/ApiProvider';

function App() {
  const loginUser = async () => {
    try {
      const test = await login('admin', 'admin');
      console.log(test);
    } catch (e) {
      console.log(e);
    }
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
