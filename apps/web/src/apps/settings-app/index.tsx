import { FC } from 'react';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import AudienceDisplaySettingsTab from './tabs/audience.js';
import MainSettingsTab from './tabs/main.js';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { EventTournamentsDropdown } from 'src/components/dropdowns/event-tournaments-dropdown.js';
import { Tournament } from '@toa-lib/models';
import FrcFmsSettingsTab from './tabs/frc-fms.js';
import { ViewReturn } from 'src/components/buttons/view-return.js';
import { useAtom, useAtomValue } from 'jotai';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import { Tabs, TabsProps, Typography } from 'antd';
import GlobalSettings from './tabs/global-settings.js';
import ErrorFallback from 'src/components/errors/error-boundary.js';
import { ErrorBoundary } from 'react-error-boundary';
import WebhooksTab from './tabs/webhooks.js';
// import FrcFmsSettingsTab from './tabs/frc-fms';

export const SettingsApp: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);

  const seasonComponents = useSeasonComponents();

  const tabs: TabsProps['items'] = [
    { label: 'Global', key: '0', children: <GlobalSettings /> }
  ];
  let header: JSX.Element = (
    <Typography.Title level={2}>Settings</Typography.Title>
  );

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  if (eventKey) {
    header = (
      <TwoColumnHeader
        left={<Typography.Title level={2}>Settings</Typography.Title>}
        right={
          <EventTournamentsDropdown
            eventKey={eventKey}
            value={tournamentKey}
            onChange={handleTournamentChange}
          />
        }
      />
    );

    tabs.push(
      { label: 'Event', key: '1', children: <MainSettingsTab /> },
      {
        label: 'Audience Display',
        key: '2',
        children: <AudienceDisplaySettingsTab />
      }
    );

    if (seasonComponents && seasonComponents.Settings) {
      tabs.push({
        label: 'Season',
        key: '3',
        children: (
          <ErrorBoundary
            fallbackRender={(props) => <ErrorFallback {...props} />}
          >
            <seasonComponents.Settings />
          </ErrorBoundary>
        )
      });
    }

    if (eventKey.toLowerCase().startsWith('frc')) {
      tabs.push({
        label: 'FRC FMS',
        key: '4',
        children: <FrcFmsSettingsTab />
      });
    }

    tabs.push({
      label: 'Webhooks',
      key: '5',
      children: <WebhooksTab />
    });
  }

  return (
    <PaperLayout header={header}>
      <ViewReturn title='Home' href={`../`} />
      {/* Tabs */}
      <Tabs defaultActiveKey={'0'} items={tabs} />

      <Typography.Text>** Settings Save Automatically</Typography.Text>
    </PaperLayout>
  );
};
