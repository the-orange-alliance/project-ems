import { ReactNode } from 'react';
import Home from './pages/home/home';
import About from './pages/about/about';
import Settings from './pages/settings/settings';
import Reports from './pages/reports/reports';
import MatchManager from './pages/match-manager/match-manager';
import EventManager from './pages/event-manager/event-manager';

import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import FestivalIcon from '@mui/icons-material/Festival';
import EventIcon from '@mui/icons-material/Event';

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
    name: 'Event Manager',
    path: '/event-manager',
    group: 0,
    element: <EventManager />,
    icon: <EventIcon />
  },
  {
    name: 'Match Manager',
    path: '/match-manager',
    group: 0,
    element: <MatchManager />,
    icon: <FestivalIcon />
  },
  {
    name: 'Reports',
    path: '/reports',
    group: 0,
    element: <Reports />,
    icon: <LibraryBooksIcon />
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
