import { ReactNode } from 'react';
import HomeApp from './apps/Home';
import EventManagerApp from './apps/EventManager';
import SettingsApp from './apps/Settings';

import HomeIcon from '@mui/icons-material/Home';
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
    element: <HomeApp />,
    icon: <HomeIcon />
  },
  {
    name: 'Event Manager',
    path: '/event-manager',
    group: 0,
    element: <EventManagerApp />,
    icon: <EventIcon />
  },
  {
    name: 'Settings',
    path: '/settings',
    group: 0,
    element: <SettingsApp />
  }
];

export default AppRoutes;
