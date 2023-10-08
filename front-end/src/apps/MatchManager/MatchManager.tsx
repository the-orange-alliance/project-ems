import { FC } from 'react';
import Typography from '@mui/material/Typography';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import PaperLayout from 'src/layouts/PaperLayout';
import EventTournamentsDropdown from 'src/components/Dropdowns/EventTournamentsDropdown';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom,
  schedulesByEventAtomFam
} from 'src/stores/NewRecoil';
import MatchManagerTabs from './components/AppTabs';
import {
  defaultEventSchedule,
  EventSchedule,
  levelToType,
  Tournament
} from '@toa-lib/models';
import { clientFetcher } from '@toa-lib/client';

const MatchManager: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);

  const handleTournamentChange = useRecoilCallback(
    ({ snapshot, set }) =>
      async (tournament: Tournament | null) => {
        if (!tournament || tournament.eventKey.length <= 0) return;
        const schedules = await snapshot.getPromise(
          schedulesByEventAtomFam(eventKey)
        );
        if (
          !schedules.find((s) => s.tournamentKey === tournament.tournamentKey)
        ) {
          let newSchedule: EventSchedule;
          // There is no schedule and we need to either find one or generate one.
          try {
            newSchedule = await clientFetcher(
              `storage/${tournament.eventKey}_${tournament.tournamentKey}.json`,
              'GET'
            );
          } catch {
            newSchedule = {
              ...defaultEventSchedule,
              eventKey,
              tournamentKey: tournament.tournamentKey,
              type: levelToType(tournament.tournamentLevel)
            };
          }
          set(schedulesByEventAtomFam(eventKey), (prev) => [
            ...prev,
            newSchedule
          ]);
        }
        set(currentTournamentKeyAtom, tournament.tournamentKey);
      }
  );

  return (
    <PaperLayout
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Match Manager</Typography>}
          right={
            <EventTournamentsDropdown
              eventKey={eventKey}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
      containerWidth='xl'
    >
      <MatchManagerTabs />
    </PaperLayout>
  );
};

export default MatchManager;
