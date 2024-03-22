import { Typography } from '@mui/material';
import { Tournament, defaultTournament } from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { useCurrentEvent } from 'src/api/use-event-data';
import {
  patchTournament,
  postTournaments,
  useTournamentsForEvent
} from 'src/api/use-tournament-data';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import { PageLoader } from 'src/components/loading/PageLoader';
import { TournamentTable } from 'src/components/tables/tournament-table';
import SaveAddUploadLoadingFab from 'src/components/util/SaveAddUploadLoadingFab';
import { useSnackbar } from 'src/hooks/use-snackbar';
import PaperLayout from 'src/layouts/PaperLayout';
import { getDifferences } from 'src/stores/Util';
import { tournamentsByEventKeyAtomFam } from 'src/stores/recoil';

export const TournamentManager: FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: initialTournaments } = useTournamentsForEvent(event?.eventKey);

  const [tournaments, setTournaments] = useRecoilState(
    tournamentsByEventKeyAtomFam(event?.eventKey ?? '')
  );
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    if (!event) return;
    if (initialTournaments && tournaments.length === 0) {
      setTournaments(initialTournaments);
    }
  }, [initialTournaments]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!event || !initialTournaments) return;
      const diffs = getDifferences(
        tournaments,
        initialTournaments,
        'tournamentKey'
      );
      if (diffs.additions.length > 0) {
        await postTournaments(diffs.additions);
      }
      for (const tournament of diffs.edits) {
        await patchTournament(tournament);
      }
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while uploading tournaments.', error);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setTournaments((prev) => [
      ...prev,
      { ...defaultTournament, eventKey, tournamentKey: '', name: '' }
    ]);
  };

  const handleEdit = (tournament: Tournament) => {
    navigate(
      `/${event?.eventKey}/tournament-manager/edit/${tournament.tournamentKey}`
    );
  };

  return event && initialTournaments ? (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      title={`${event.eventKey} | Tournament Manager`}
      titleLink={`/${event.eventKey}`}
      padding
    >
      <ViewReturn title='Home' href={`/${event.eventKey}`} sx={{ mb: 1 }} />
      <SaveAddUploadLoadingFab
        loading={loading}
        onAdd={handleAdd}
        onSave={handleSave}
        canAdd
        canSave
        addTooltip='Add Tournament'
        saveTooltip='Save Tournaments'
      />
      <TournamentTable
        event={event}
        tournaments={tournaments}
        onEdit={handleEdit}
      />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
