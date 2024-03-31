import { FC } from 'react';
import { useCurrentEvent } from 'src/api/use-event-data';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { MatchControl } from './match-control/match-control';
import { ScorekeeperTabs } from './tabs/scorekeeper-tabs';
import { MatchHeader } from './match-header/match-header';

export const ScorekeeperApp: FC = () => {
  const { data: event } = useCurrentEvent();
  return (
    <DefaultLayout
      containerWidth='xl'
      title={`${event?.eventName} | Scorekeeper App`}
      titleLink={`/${event?.eventKey}`}
    >
      <MatchHeader />
      <MatchControl />
      <ScorekeeperTabs eventKey={event?.eventKey} />
    </DefaultLayout>
  );
};
