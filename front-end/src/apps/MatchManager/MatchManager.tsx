import { FC } from 'react';
import Typography from '@mui/material/Typography';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import PaperLayout from 'src/layouts/PaperLayout';
import EventTournamentsDropdown from 'src/components/Dropdowns/EventTournamentsDropdown';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import {
  currentEventKeySelector,
  currentTournamentKeyAtom,
  schedulesByEventAtomFam
} from 'src/stores/NewRecoil';
import MatchManagerTabs from './components/AppTabs';
import { defaultEventSchedule } from '@toa-lib/models';

const MatchManager: FC = () => {
  const eventKey = useRecoilValue(currentEventKeySelector);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);

  const handleTournamentChange = useRecoilCallback(
    ({ snapshot, set }) =>
      async (value: string) => {
        const schedules = await snapshot.getPromise(
          schedulesByEventAtomFam(eventKey)
        );
        if (!schedules.find((s) => s.tournamentKey === value)) {
          // There is no schedule and we need to generate a default event schedule.
          const newSchedule = {
            ...defaultEventSchedule,
            eventKey,
            tournamentKey: value
          };
          set(schedulesByEventAtomFam(eventKey), (prev) => [
            ...prev,
            newSchedule
          ]);
        }
        set(currentTournamentKeyAtom, value);
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
