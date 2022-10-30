import { ReactNode, lazy } from 'react';
const HomeApp = lazy(() => import('./apps/Home/index'));
const EventManagerApp = lazy(() => import('./apps/EventManager'));
const SettingsApp = lazy(() => import('./apps/Settings'));
const EventSelection = lazy(() => import('./apps/EventSelection'));
// const AccountManager = lazy(() => import('./apps/AccountManager'));
// const AdminApp = lazy(() => import('./apps/Admin'));
// const TeamManager = lazy(() => import('./apps/TeamManager'));
// const MatchManager = lazy(() => import('./apps/MatchManager'));
// const ScoringApp = lazy(() => import('./apps/Scoring'));
// const RefereeApp = lazy(() => import('./apps/Referee/Referee'));
// const ScoreKeeper = lazy(() => import('./apps/Referee/ScoreKeeper'));
// const RedReferee = lazy(() => import('./apps/Referee/RedReferee'));
// const BlueReferee = lazy(() => import('./apps/Referee/BlueReferee'));
// const HeadReferee = lazy(() => import('./apps/Referee/HeadReferee'));
// const AudienceDisplay = lazy(() => import('./apps/AudienceDisplay'));
// const FieldDebugger = lazy(() => import('./apps/FieldDebugger'));
// const Reports = lazy(() => import('./apps/Reports'));
// const Streaming = lazy(() => import('./apps/Streaming/Streaming'));
// const QueueingDisplay = lazy(() => import('./apps/QueueingDisplay'));
// const JBApp = lazy(() => import('./apps/JBApp'));

import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
export interface AppRoute {
  name: string;
  path: string;
  group: number;
  element: ReactNode;
  icon?: ReactNode;
  hidden?: boolean;
  routes?: AppRoute[];
}

const AppRoutes: AppRoute[] = [
  {
    name: 'Event Selection',
    path: '/',
    group: 0,
    element: <EventSelection />,
    icon: <EventIcon />
  },
  {
    name: 'Event Manager',
    path: '/:eventKey/event-manager',
    group: 0,
    element: <EventManagerApp />,
    icon: <EventIcon />
  },
  {
    name: 'Event Home',
    path: '/:eventKey',
    group: 0,
    element: <HomeApp />,
    icon: <HomeIcon />
  },
  {
    name: 'Settings',
    path: '/:eventKey/settings',
    group: 0,
    element: <SettingsApp />
  }
  // {
  //   name: 'Team Manager',
  //   path: '/team-manager',
  //   group: 0,
  //   element: <TeamManager />,
  //   hidden: true
  // },
  // {
  //   name: 'Match Manager',
  //   path: '/match-manager',
  //   group: 0,
  //   element: <MatchManager />,
  //   hidden: true
  // },
  // {
  //   name: 'Account Manager',
  //   path: '/accounts',
  //   group: 0,
  //   element: <AccountManager />,
  //   hidden: false
  // },
  // {
  //   name: 'Scoring App',
  //   path: '/scoring',
  //   group: 0,
  //   element: <ScoringApp />
  // },
  // {
  //   name: 'Referee App',
  //   path: '/referee',
  //   group: 0,
  //   element: <RefereeApp />
  // },
  // {
  //   name: 'Score Keeper Page',
  //   path: '/referee/scorekeeper',
  //   group: 0,
  //   element: <ScoreKeeper />
  // },
  // {
  //   name: 'Head Referee Page',
  //   path: '/referee/head',
  //   group: 0,
  //   element: <HeadReferee />
  // },
  // {
  //   name: 'Red Referee Page',
  //   path: '/referee/red',
  //   group: 0,
  //   element: <RedReferee />
  // },
  // {
  //   name: 'Blue Referee Page',
  //   path: '/referee/blue',
  //   group: 0,
  //   element: <BlueReferee />
  // },
  // {
  //   name: 'Audience Display',
  //   path: '/audience',
  //   group: 0,
  //   element: <AudienceDisplay />
  // },
  // {
  //   name: 'Admin App',
  //   path: '/admin',
  //   group: 0,
  //   element: <AdminApp />,
  //   hidden: true
  // },
  // {
  //   name: 'Reports App',
  //   path: '/reports',
  //   group: 0,
  //   element: <Reports />,
  //   hidden: true
  // },
  // {
  //   name: 'Field Debugger',
  //   path: '/fcs-debug',
  //   group: 0,
  //   element: <FieldDebugger />,
  //   hidden: true
  // },
  // {
  //   name: 'Settings',
  //   path: '/settings',
  //   group: 0,
  //   element: <SettingsApp />
  // },
  // {
  //   name: 'Streaming',
  //   path: '/streaming',
  //   group: 0,
  //   element: <Streaming />
  // },
  // {
  //   name: 'Queueing Display',
  //   path: '/queueing',
  //   group: 0,
  //   element: <QueueingDisplay />
  // },
  // {
  //   name: 'JB App',
  //   path: '/jb',
  //   group: 0,
  //   element: <JBApp />
  // }
];

export default AppRoutes;
