import { FC } from 'react';
import { DefaultLayout } from '@layouts/default-layout.js';
import { MatchControl } from './match-control/match-control.js';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs.js';
import { MatchHeader } from './match-header/match-header.js';
import { Flex } from 'antd';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { useMatchLifecycleWebhooks } from './hooks/use-match-lifecycle-webhooks.js';

export const ScorekeeperApp: FC = () => {
  const {
    loading,
    state: {
      local: { event, teams }
    }
  } = useEventState({ event: true, teams: true });

  // Scoped here rather than to ConnectionManager on purpose; see the hook.
  useMatchLifecycleWebhooks();

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
        <Flex vertical gap={16} style={{ marginTop: 16, width: '100%' }}>
          <MatchHeader teams={teams} />
          <MatchControl />
          <ScorekeeperTabs eventKey={event?.eventKey} />
        </Flex>
      </DefaultLayout>
    </>
  );
};
