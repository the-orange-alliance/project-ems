import { Typography } from '@mui/material';
import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useCurrentEvent } from 'src/api/use-event-data';
import { PageLoader } from 'src/components/loading/PageLoader';
import TwoColumnHeader from 'src/components/util/Headers/TwoColumnHeader';
import PaperLayout from 'src/layouts/PaperLayout';
import { currentTournamentKeyAtom } from 'src/stores/NewRecoil';
import { ScheduleTabs } from './tabs/schedule-tabs';
import { useScheduleForTournament } from 'src/api/use-schedule-data';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown';
import { useTournamentsForEvent } from 'src/api/use-tournament-data';
import { defaultEventSchedule, levelToType } from '@toa-lib/models';
import { useMatchesForTournament } from 'src/api/use-match-data';

export const ScheduleManager: FC = () => {
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
  const { data: event } = useCurrentEvent();
  const { data: tournaments } = useTournamentsForEvent(event?.eventKey);
  const {
    data: eventSchedule,
    isLoading: isScheduleLoading,
    mutate: mutateSchedule
  } = useScheduleForTournament(event?.eventKey, tournamentKey);
  const { data: matches } = useMatchesForTournament(
    event?.eventKey,
    tournamentKey
  );
  const hasMatches = eventSchedule && matches && matches.length > 0;

  useEffect(() => {
    if (
      !isScheduleLoading &&
      !eventSchedule &&
      event &&
      tournamentKey &&
      tournaments
    ) {
      // TODO - What if we don't need to create one here?
      const tournament = tournaments.find(
        (t) => t.tournamentKey === tournamentKey
      );
      if (!tournament) return;
      mutateSchedule({
        ...defaultEventSchedule,
        eventKey: event?.eventKey,
        tournamentKey,
        type: levelToType(tournament.tournamentLevel)
      });
    }
  }, [
    isScheduleLoading,
    eventSchedule,
    event,
    tournamentKey,
    tournaments,
    mutateSchedule
  ]);

  const handleTournamentChange = (tournamentKey: string) => {
    setTournamentKey(tournamentKey);
  };

  return event ? (
    <PaperLayout
      containerWidth='xl'
      title={`${event.eventName} | Schedule Manager`}
      titleLink={`/${event.eventKey}`}
      showSettings
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Schedule Manager</Typography>}
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
      <ScheduleTabs
        tournamentKey={tournamentKey}
        eventSchedule={eventSchedule}
        hasMatches={hasMatches}
      />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
