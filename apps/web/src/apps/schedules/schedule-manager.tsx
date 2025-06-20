import { Typography } from 'antd';
import { FC, Suspense } from 'react';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { ScheduleTabs } from './tabs/schedule-tabs.js';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown.js';
import { useAtom } from 'jotai';
import { tournamentKeyAtom } from '@stores/state/event.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import {
  patchScheduleParams,
  useScheduleParamsForTournament
} from 'src/api/use-schedule-data.js';
import { ScheduleParams } from '@toa-lib/models';
import { PageLoader } from 'src/components/loading/page-loader.js';

export const ScheduleManager: FC = () => {
  const { state } = useEventState({
    event: true,
    tournaments: true,
    matches: true
  });
  const {
    local: { event, tournaments },
    remote: { matches }
  } = state;

  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);

  const { data: scheduleParams, mutate: refetchScheduleParams } =
    useScheduleParamsForTournament(event?.eventKey, tournamentKey);

  const onScheduleParamsChange = (schedule: ScheduleParams) => {
    patchScheduleParams(schedule).then(() => {
      return refetchScheduleParams();
    });
  };
  useUpdateAppbar(
    {
      title: event ? `${event.eventName} | Tournament Manager` : undefined,
      titleLink: event ? `/${event.eventKey}` : undefined
    },
    [event]
  );

  const handleTournamentChange = (tournamentKey: string) => {
    setTournamentKey(tournamentKey);
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Schedule Manager</Typography.Title>}
          right={
            <TournamentDropdown
              tournaments={tournaments}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <Suspense fallback={<PageLoader />}>
        <ScheduleTabs
          tournamentKey={tournamentKey}
          eventSchedule={scheduleParams}
          onEventScheduleChange={onScheduleParamsChange}
          savedMatches={matches}
          hasMatches={matches.length > 0}
        />
      </Suspense>
    </PaperLayout>
  );
};
