import { FC } from 'react';
import Typography from '@mui/material/Typography';
import TwoColumnHeader from 'src/components/util/Headers/TwoColumnHeader';
import PaperLayout from 'src/layouts/PaperLayout';
import EventTournamentsDropdown from 'src/components/dropdowns/EventTournamentsDropdown';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom,
  schedulesByEventAtomFam,
  tournamentsByEventAtomFam
} from 'src/stores/NewRecoil';
import MatchManagerTabs from './components/AppTabs';
import {
  defaultEventSchedule,
  EventSchedule,
  levelToType,
  Tournament
} from '@toa-lib/models';
import { clientFetcher } from '@toa-lib/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const MatchManager: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const tournaments = useRecoilValue(tournamentsByEventAtomFam(eventKey));
  const navigate = useNavigate();

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

      <Dialog
        open={tournaments.length === 0}
        // onClose={handleClose}
      >
        <DialogTitle>Create Tournament First</DialogTitle>
        <DialogContent>
          <DialogContentText>
            No tournaments have been created. A tournament must be created
            before a match schedule can be created.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(`/${eventKey}`)}>Go Back</Button>
          <Button
            onClick={() => navigate(`/${eventKey}/tournament-manager`)}
            autoFocus
          >
            Create A Tournament
          </Button>
        </DialogActions>
      </Dialog>
    </PaperLayout>
  );
};

export default MatchManager;
