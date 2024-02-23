import React, { ReactNode, lazy } from 'react';
const HomeApp = lazy(() => import('./apps/Home/index'));
const EventManagerApp = lazy(() => import('./apps/EventManager'));
const SettingsApp = lazy(() => import('./apps/Settings'));
const GlobalSettingsApp = lazy(() => import('./apps/Settings/GlobalSettings'));
const EventSelection = lazy(() => import('./apps/EventSelection'));
const TeamManager = lazy(() => import('./apps/TeamManager'));
const TournamentManager = lazy(() => import('./apps/TournamentManager'));
const MatchManager = lazy(() => import('./apps/MatchManager'));
const ScoringApp = lazy(() => import('./apps/Scoring'));
const AudienceDisplay = lazy(() => import('./apps/AudienceDisplay'));
const RefereeApp = lazy(() => import('./apps/Referee/Referee'));
const RedReferee = lazy(() => import('./apps/Referee/RedReferee'));
const BlueReferee = lazy(() => import('./apps/Referee/BlueReferee'));
const HeadReferee = lazy(() => import('./apps/Referee/HeadReferee'));
const Reports = lazy(() => import('./apps/Reports'));
const AdminApp = lazy(() => import('./apps/Admin'));
const FrcFmsFieldMonitorApp = lazy(() => import('./apps/FrcFmsFieldMonitor'));
const QueueingDisplay = lazy(() => import('./apps/QueueingDisplay'));
const JBApp = lazy(() => import('./apps/JBApp'));
const Streaming = lazy(() => import('./apps/Streaming/Streaming'));
// const AccountManager = lazy(() => import('./apps/AccountManager'));
// const RefereeApp = lazy(() => import('./apps/Referee/Referee'));
// const ScoreKeeper = lazy(() => import('./apps/Referee/ScoreKeeper'));
// const HeadReferee = lazy(() => import('./apps/Referee/HeadReferee'));
// const FieldDebugger = lazy(() => import('./apps/FieldDebugger'));

import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import AudienceDisplayManager from './apps/AudienceDisplayManager';
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
    name: 'Team Manager',
    path: '/:eventKey/team-manager',
    group: 0,
    element: <TeamManager />,
    icon: <HomeIcon />
  },
  {
    name: 'Tournament Manager',
    path: '/:eventKey/tournament-manager',
    group: 0,
    element: <TournamentManager />,
    icon: <HomeIcon />
  },
  {
    name: 'Match Manager',
    path: '/:eventKey/match-manager',
    group: 0,
    element: <MatchManager />,
    hidden: true
  },
  {
    name: 'Scoring App',
    path: '/:eventKey/scoring',
    group: 0,
    element: <ScoringApp />
  },
  {
    name: 'Settings',
    path: '/:eventKey/settings',
    group: 0,
    element: <SettingsApp />
  },
  {
    name: 'Audience Display',
    path: '/:eventKey/audience',
    group: 0,
    element: <AudienceDisplay />
  },
  {
    name: 'Referee App',
    path: '/:eventKey/referee',
    group: 0,
    element: <RefereeApp />
  },
  {
    name: 'Red Referee Page',
    path: '/:eventKey/referee/red',
    group: 0,
    element: <RedReferee />
  },
  {
    name: 'Blue Referee Page',
    path: '/:eventKey/referee/blue',
    group: 0,
    element: <BlueReferee />
  },
  {
    name: 'Head Referee Page',
    path: '/:eventKey/referee/head',
    group: 0,
    element: <HeadReferee />
  },
  {
    name: 'Reports App',
    path: '/:eventKey/reports',
    group: 0,
    element: <Reports />,
    hidden: true
  },
  {
    name: 'Admin App',
    path: '/:eventKey/admin',
    group: 0,
    element: <AdminApp />,
    hidden: true
  },
  {
    name: 'Settings',
    path: '/:eventKey/settings',
    group: 0,
    element: <SettingsApp />
  },
  {
    name: 'Settings',
    path: '/global-settings',
    group: 0,
    element: <GlobalSettingsApp />
  },
  {
    name: 'FRC FMS Field Monitor',
    path: '/frc/fms/fieldmonitor',
    group: 0,
    element: <FrcFmsFieldMonitorApp />
  },
  {
    name: 'Queueing Display',
    path: '/:eventKey/queueing',
    group: 0,
    element: <QueueingDisplay />
  },
  {
    name: 'JB App',
    path: '/:eventKey/jb',
    group: 0,
    element: <JBApp />
  },
  {
    name: 'Streaming',
    path: '/:eventKey/streaming',
    group: 0,
    element: <Streaming />
  },
  {
    name: 'Audience Display Manager',
    path: '/audience-display-manager',
    group: 0,
    element: <AudienceDisplayManager />
  }
  // {
  //   name: 'Account Manager',
  //   path: '/accounts',
  //   group: 0,
  //   element: <AccountManager />,
  //   hidden: false
  // },
  // {
  //   name: 'Field Debugger',
  //   path: '/fcs-debug',
  //   group: 0,
  //   element: <FieldDebugger />,
  //   hidden: true
  // },
];

export default AppRoutes;
