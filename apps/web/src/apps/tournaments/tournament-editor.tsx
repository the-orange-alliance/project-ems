import { Typography } from '@mui/material';
import { Tournament } from '@toa-lib/models';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useCurrentEvent } from 'src/api/use-event-data';
import { ViewReturn } from 'src/components/buttons/view-return';
import { TournamentForm } from 'src/components/forms/tournament-form';
import { PageLoader } from 'src/components/loading/page-loader';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { PaperLayout } from 'src/layouts/paper-layout';
import { currentTournamentKeyAtom } from 'src/stores/recoil';
import { tournamentsByEventKeyAtomFam } from 'src/stores/recoil';

export const TournamentEditor: FC = () => {
  const { data: event } = useCurrentEvent();
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const [tournaments, setTournaments] = useRecoilState(
    tournamentsByEventKeyAtomFam(event?.eventKey ?? '')
  );
  const tournament = tournaments.find((t) => t.tournamentKey === tournamentKey);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const onSubmit = async (tournament: Tournament) => {
    setTournaments((prev) =>
      prev.map((t) =>
        t.tournamentKey === tournament.tournamentKey ? tournament : t
      )
    );
    showSnackbar(`Modified tournament ${tournament.tournamentKey}`);
    navigate(`/${tournament.eventKey}/tournament-manager`);
  };
  return event ? (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      title={`/${event.eventKey} | Tournament Editor`}
      titleLink={`/${event.eventKey}/tournament-manager`}
      padding
    >
      <ViewReturn
        title='Tournaments'
        href={`/${event.eventKey}/tournament-manager`}
      />
      <TournamentForm initialTournament={tournament} onSubmit={onSubmit} />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
