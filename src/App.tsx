import AppLayout from './components/app-layout/app-layout';
import { Routes, Route } from 'react-router-dom';
import routes from './AppRoutes';
import './App.less';

function App() {
  return (
    <AppLayout routes={routes}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.name} path={route.path} element={route.element} />
        ))}
      </Routes>
    </AppLayout>
  );
}

export default App;
