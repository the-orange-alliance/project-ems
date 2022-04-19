import { ReactNode } from 'react';
import Home from './pages/home/home';
import About from './pages/about/about';
import Settings from './pages/settings/settings';

import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

export interface AppRoute {
  name: string;
  path: string;
  group: number;
  element: ReactNode;
  icon?: ReactNode;
  hidden?: boolean;
}

const AppRoutes: AppRoute[] = [
  {
    name: 'Home',
    path: '/',
    group: 0,
    element: <Home />,
    icon: <HomeIcon />
  },
  {
    name: 'About',
    path: '/about',
    group: 1,
    element: <About />,
    icon: <InfoIcon />
  },
  {
    name: 'Settings',
    path: '/settings',
    group: 1,
    element: <Settings />,
    icon: <SettingsIcon />
  }
];

export default AppRoutes;
