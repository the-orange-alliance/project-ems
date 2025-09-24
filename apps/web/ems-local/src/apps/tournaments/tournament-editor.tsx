import { Typography } from 'antd';
import { Tournament } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewReturn } from 'src/components/buttons/view-return.js';
import { TournamentForm } from 'src/components/forms/tournament-form.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { tournamentKeyAtom } from 'src/stores/state/event.js';

export const TournamentEditor: FC = () => {
  const { state } = useEventState({ event: true, teams: true });
  const {
    setModifiedTournaments,
    local: { event, tournaments }
  } = state;

  const tournamentKey = useAtomValue(tournamentKeyAtom);

  const tournament = tournaments.find((t) => t.tournamentKey === tournamentKey);

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const onSubmit = async (tournament: Tournament) => {
    if (tournaments.length <= 0) return;

    const newModifiedTournaments = state.staged.tournaments.find(
      (t) => t.tournamentKey === tournament.tournamentKey
    )
      ? state.staged.tournaments.map((t) =>
          t.tournamentKey === tournament.tournamentKey ? tournament : t
        )
      : [...state.staged.tournaments, tournament];

    setModifiedTournaments(newModifiedTournaments);
    showSnackbar(`Modified tournament ${tournament.tournamentKey}`);
    navigate(`/${tournament.eventKey}/tournament-manager`);
  };

  return event ? (
    <PaperLayout
      containerWidth='xl'
      header={<Typography.Title level={3}>Tournament Manager</Typography.Title>}
      title={`/${event.eventKey} | Tournament Editor`}
      titleLink={`/${event.eventKey}/tournament-manager`}
      padding
    >
      <TournamentForm
        initialTournament={tournament}
        onSubmit={onSubmit}
        returnTo={`/${event?.eventKey}/tournament-manager`}
      />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
