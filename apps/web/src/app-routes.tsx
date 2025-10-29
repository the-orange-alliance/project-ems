import { FC, LazyExoticComponent, ReactNode, lazy } from 'react';
import THE_MAN from './assets/images/the_man.jpg';
import THE_BOY from './assets/images/director_of_inside_sales.jpg';

// Home route
const HomeApp = lazy(() => import('./apps/index.js'));

// Event routes
const EventSelection = lazy(() =>
  import('./apps/events/index.js').then((m) => ({ default: m.EventSelection }))
);
const EventCreation = lazy(() =>
  import('./apps/events/index.js').then((m) => ({ default: m.EventCreation }))
);
const EventManager = lazy(() =>
  import('./apps/events/index.js').then((m) => ({ default: m.EventManager }))
);

// Team Routes
const TeamManager = lazy(() =>
  import('./apps/teams/index.js').then((m) => ({ default: m.TeamManager }))
);
const TeamCountTag = lazy(() =>
  import('./components/util/app-chips.js').then((m) => ({
    default: m.TeamCountTag
  }))
);
const TeamEditor = lazy(() =>
  import('./apps/teams/index.js').then((m) => ({ default: m.TeamEdior }))
);

// Tournament Routes
const TournamentManager = lazy(() =>
  import('./apps/tournaments/index.js').then((m) => ({
    default: m.TournamentManager
  }))
);
const TournamentCountTag = lazy(() =>
  import('./components/util/app-chips.js').then((m) => ({
    default: m.TournamentCountTag
  }))
);
const MatchCountTag = lazy(() =>
  import('./components/util/app-chips.js').then((m) => ({
    default: m.MatchCountTag
  }))
);
const TournamentEditor = lazy(() =>
  import('./apps/tournaments/index.js').then((m) => ({
    default: m.TournamentEditor
  }))
);

// Schedule Routes
const ScheduleManager = lazy(() =>
  import('./apps/schedules/index.js').then((m) => ({
    default: m.ScheduleManager
  }))
);

// Scorekeeper Routes
const ScorekeeperApp = lazy(() =>
  import('./apps/scorekeeper/index.js').then((m) => ({
    default: m.ScorekeeperApp
  }))
);

// Admin Routes
const AdminApp = lazy(() =>
  import('./apps/admin-app/index.js').then((m) => ({ default: m.AdminApp }))
);

// Silly Routes
const JBApp = lazy(() =>
  import('./apps/jb-app/jb-app.js').then((m) => ({ default: m.JBApp }))
);

// Streaming Routes
// const Streaming = lazy(() =>
//   import('./apps/stream').then((m) => ({ default: m.StreamApp }))
// );

// Audience Display Routes
// const AudienceDisplayManager = lazy(() =>
//   import('./apps/audience-display-manager').then((m) => ({
//     default: m.AudienceDisplayManager
//   }))
// );

// Field Monitor Routes
// const FrcFmsFieldMonitorApp = lazy(() =>
//   import('./apps/field-monitor').then((m) => ({
//     default: m.FrcFmsFieldMonitorApp
//   }))
// );

// Queueing Display Routes
// const QueueingManager = lazy(() =>
//   import('./apps/queueing').then((m) => ({ default: m.QueueingManager }))
// );

// Report Routes
const Reports = lazy(() =>
  import('./apps/report-app/index.js').then((m) => ({ default: m.Reports }))
);
// Settings Routes
const SettingsApp = lazy(() =>
  import('./apps/settings-app/index.js').then((m) => ({
    default: m.SettingsApp
  }))
);

// Referee Routes
const RefereeApp = lazy(() =>
  import('./apps/referee-app/index.js').then((m) => ({ default: m.RefereeApp }))
);
const RedReferee = lazy(() =>
  import('./apps/referee-app/index.js').then((m) => ({ default: m.RedReferee }))
);
const BlueReferee = lazy(() =>
  import('./apps/referee-app/index.js').then((m) => ({
    default: m.BlueReferee
  }))
);
const HeadReferee = lazy(() =>
  import('./apps/referee-app/index.js').then((m) => ({
    default: m.HeadReferee
  }))
);
const HeadRefereeMin = lazy(() =>
  import('./apps/referee-app/index.js').then((m) => ({
    default: m.HeadRefereeMin
  }))
);

// Audience Display Routes
const AudienceDisplay = lazy(() =>
  import('./apps/audience-display/index.js').then((m) => ({
    default: m.AudienceDisplay
  }))
);

// Misc routes
const EventMonitor = lazy(() =>
  import('./apps/event-monitor/index.js').then((m) => ({
    default: m.EventMonitor
  }))
);

// Unised Routes
// const AccountManager = lazy(() => import('./apps/AccountManager'));
// const RefereeApp = lazy(() => import('./apps/Referee/Referee'));
// const ScoreKeeper = lazy(() => import('./apps/Referee/ScoreKeeper'));
// const HeadReferee = lazy(() => import('./apps/Referee/HeadReferee'));
// const FieldDebugger = lazy(() => import('./apps/FieldDebugger'));

// Season specific apps
// const FRC2024_HumanPlayer = lazy(
//   () => import('./apps/SeasonSpecific/frc_2024/HumanPlayer')
// );

import {
  CalendarOutlined,
  CodeOutlined,
  CompassOutlined,
  ControlOutlined,
  FlagOutlined,
  FormOutlined,
  FundProjectionScreenOutlined,
  PrinterOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined
} from '@ant-design/icons';
export interface AppRoute {
  name: string; // Name of the route, used for display in menus
  path: string; // Path of the route, can include parameters like :eventKey
  group: number; // Grouping number for sorting routes, lower numbers appear first
  element: LazyExoticComponent<FC>; // React component to render for this route
  icon?: ReactNode; // Icon to display in menus, optional
  image?: string; // Image src to displai in in the app card, optional
  hidden?: boolean; // Whether the route should be hidden from menus
  routes?: AppRoute[]; // Sub-routes for nested routing, optional
  exact?: boolean; // Whether the route should match exactly, optional
  eventOrder?: number; // Order to show in the event flow list
  eventListRenderer?: LazyExoticComponent<FC>; // Custom renderer for event list, can show data like team count, tournament count, etc.
  hideAppbar?: boolean; // Whether to hide the appbar for this route, optional
  online?: boolean; // Whether the route appears as online, optional
}

const AppRoutes: AppRoute[] = [
  {
    name: 'Event Selection',
    path: '/',
    group: 0,
    element: EventSelection,
    hidden: true,
    online: true
  },
  {
    name: 'Event Creation',
    path: '/create-event',
    group: 0,
    element: EventCreation,
    hidden: true,
    online: true
  },
  {
    name: 'Manage Event',
    path: '/:eventKey/event-manager',
    group: 0,
    element: EventManager,
    icon: <CalendarOutlined />,
    eventOrder: 1,
    online: true
  },
  {
    name: 'Event Home',
    path: '/:eventKey',
    group: 0,
    element: HomeApp,
    hidden: true,
    online: true
  },
  {
    name: 'Manage Teams',
    path: '/:eventKey/team-manager',
    group: 0,
    element: TeamManager,
    icon: <TeamOutlined />,
    eventListRenderer: TeamCountTag,
    eventOrder: 2,
    online: true
  },
  {
    name: 'Team Editor',
    path: '/:eventKey/team-manager/edit/:teamKey',
    group: 0,
    element: TeamEditor,
    hidden: true,
    online: true
  },
  {
    name: 'Manage Tournaments',
    path: '/:eventKey/tournament-manager',
    group: 0,
    element: TournamentManager,
    icon: <CompassOutlined />,
    eventListRenderer: TournamentCountTag,
    eventOrder: 3,
    online: true
  },
  {
    name: 'Tournament Editor',
    path: '/:eventKey/tournament-manager/edit/:tournamentKey',
    group: 0,
    element: TournamentEditor,
    icon: <FormOutlined />,
    hidden: true,
    online: true
  },
  {
    name: 'Manage Schedules',
    path: '/:eventKey/schedule-manager',
    group: 0,
    icon: <ControlOutlined />,
    eventListRenderer: MatchCountTag,
    element: ScheduleManager,
    eventOrder: 4,
    online: true
  },
  {
    name: 'Scorekeeper App',
    path: '/:eventKey/scorekeeper',
    group: 0,
    element: ScorekeeperApp,
    eventOrder: 5,
    icon: <RobotOutlined />
  },
  {
    name: 'Referee App',
    path: '/:eventKey/referee',
    group: 0,
    element: RefereeApp,
    eventOrder: 6,
    icon: <FlagOutlined />
  },
  {
    name: 'Red Referee Page',
    path: '/:eventKey/referee/red',
    group: 0,
    element: RedReferee,
    hidden: true
  },
  {
    name: 'Blue Referee Page',
    path: '/:eventKey/referee/blue',
    group: 0,
    element: BlueReferee,
    hidden: true
  },
  {
    name: 'Head Referee Page',
    path: '/:eventKey/referee/head',
    group: 0,
    element: HeadReferee,
    hidden: true
  },
  {
    name: 'Head Referee Page',
    path: '/:eventKey/referee/head-min',
    group: 0,
    element: HeadRefereeMin,
    hidden: true
  },
  {
    name: 'Admin App',
    path: '/:eventKey/admin',
    group: 0,
    element: AdminApp,
    icon: <CodeOutlined style={{ fontSize: '100px', marginBottom: '50px' }} />
  },
  // {
  //   name: 'Settings',
  //   path: '/:eventKey/settings',
  //   group: 0,
  //   element: SettingsApp
  // },
  {
    name: 'Audience Display',
    path: '/:eventKey/audience',
    group: 0,
    element: AudienceDisplay,
    hideAppbar: true,
    icon: (
      <FundProjectionScreenOutlined
        style={{ fontSize: '100px', marginBottom: '50px' }}
      />
    )
  },
  {
    name: 'Reports App',
    path: '/:eventKey/reports',
    group: 0,
    element: Reports,
    icon: (
      <PrinterOutlined style={{ fontSize: '100px', marginBottom: '50px' }} />
    )
  },
  {
    name: 'Settings',
    path: '/:eventKey/settings',
    group: 0,
    element: SettingsApp,
    icon: (
      <SettingOutlined style={{ fontSize: '100px', marginBottom: '50px' }} />
    )
  },
  {
    name: 'Settings', // point to same spot. centralized settings!
    path: '/settings',
    group: 0,
    element: SettingsApp,
    hidden: true
  },
  // {
  //   name: 'FRC FMS Field Monitor',
  //   path: '/frc/fms/fieldmonitor',
  //   group: 0,
  //   element: FrcFmsFieldMonitorApp,
  //   hidden: true
  // },
  // {
  //   name: 'Queueing Display',
  //   path: '/:eventKey/queue-manager',
  //   group: 0,
  //   element: QueueingManager
  // },
  {
    name: 'JB App',
    path: '/:eventKey/jb',
    group: 0,
    element: JBApp,
    hidden: false,
    hideAppbar: true,
    image: THE_MAN
  },
  {
    name: 'Jan App',
    path: '/:eventKey/event-monitor',
    group: 0,
    element: EventMonitor,
    image: THE_BOY
  }
  // {
  //   name: 'Streaming',
  //   path: '/:eventKey/streaming',
  //   group: 0,
  //   element: Streaming
  // },
  // {
  //   name: 'Audience Display Manager',
  //   path: '/audience-display-manager',
  //   group: 0,
  //   element: AudienceDisplayManager
  // },
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
