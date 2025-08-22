import { FC } from 'react';
import { DefaultLayout } from '@layouts/default-layout.js';
import { MatchControl } from './match-control/match-control.js';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs.js';
import { MatchHeader } from './match-header/match-header.js';
import { Row } from 'antd';
// import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
// import { useSocket } from 'src/api/use-socket.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart.js';

export const ScorekeeperApp: FC = () => {
  const {
    loading,
    state: {
      local: { event, teams }
    }
  } = useEventState({ event: true, teams: true });
  // const [, connected] = useSocket();
  // const fieldControl = useSeasonFieldControl();

  // useEffect(() => {
  //   if (connected) fieldControl?.updateFieldSettings?.();
  // }, [connected]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <DefaultLayout
        containerWidth='xl'
        title={`${event?.eventName} | Scorekeeper App`}
        titleLink={`/${event?.eventKey}`}
      >
        <Row style={{ marginBottom: 24, width: '100%' }}>
          <MatchHeader teams={teams} />
        </Row>
        <Row style={{ marginBottom: 24, width: '100%' }}>
          <MatchControl />
        </Row>
        <Row style={{ marginBottom: 24 }}>
          <ScorekeeperTabs eventKey={event?.eventKey} />
        </Row>
      </DefaultLayout>
    </>
  );
};
