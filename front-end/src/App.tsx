import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';

function App() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.name} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export default App;
