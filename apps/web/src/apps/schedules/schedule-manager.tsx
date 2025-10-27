import { Typography } from 'antd';
import { FC, Suspense } from 'react';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { ScheduleTabs } from './tabs/schedule-tabs.js';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown.js';
import { useAtom, useAtomValue } from 'jotai';
import { tournamentKeyAtom } from '@stores/state/event.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import {
  getScheduleParams,
  patchScheduleParams,
  useScheduleParamsForTournament
} from 'src/api/use-schedule-data.js';
import { ScheduleParams } from '@toa-lib/models';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { APIOptions } from '@toa-lib/client';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

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
  const { showSnackbar } = useSnackbar();
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const remoteUrl = useAtomValue(remoteApiUrlAtom);

  const { data: scheduleParams, mutate: refetchScheduleParams } =
    useScheduleParamsForTournament(event?.eventKey, tournamentKey);

  const onScheduleParamsChange = (schedule: ScheduleParams) => {
    const tournament = tournaments.find(
      (t) => t.tournamentKey === tournamentKey
    );
    if (!tournament) return;
    schedule.type = tournament.tournamentType;
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

  const handleParamsDownload = async () => {
    if (!event || !tournamentKey) return;
    try {
      const previousUrl = APIOptions.host;
      APIOptions.host = remoteUrl;
      const scheduleParams = await getScheduleParams(
        event?.eventKey,
        tournamentKey
      );
      APIOptions.host = previousUrl;
      onScheduleParamsChange(scheduleParams);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while downloading teams.', error);
    }
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Schedule Manager</Typography.Title>}
          right={
            <div>
              <TournamentDropdown
                tournaments={tournaments}
                value={tournamentKey}
                onChange={handleTournamentChange}
              />
              <MoreButton
                menuItems={[
                  {
                    key: '1',
                    label: (
                      <a onClick={handleParamsDownload}>
                        Download Schedule Params
                      </a>
                    )
                  }
                ]}
              />
            </div>
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
