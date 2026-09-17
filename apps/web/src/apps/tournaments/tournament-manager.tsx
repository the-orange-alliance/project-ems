import { Typography } from 'antd';
import { Tournament, defaultTournament, tournamentZod } from '@toa-lib/models';
import { FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { mutate } from 'swr';
import { useModal } from '@ebay/nice-modal-react';
import { tournamentsApi } from 'src/api/use-tournament-data.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TournamentRemovalDialog } from 'src/components/dialogs/tournament-removal-dialog.js';
import { TournamentTable } from 'src/components/tables/tournament-table.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { useElevatedAction } from 'src/hooks/use-elevated-action.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { getDifferences } from 'src/stores/array-utils.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';
import { useAtomValue } from 'jotai';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { normalizeRemoteApiHost } from 'src/util/remote-api-host.js';
import { remoteClient } from 'src/api/http-clients.js';

export const TournamentManager: FC = () => {
  const { loading, state } = useEventState({
    event: true,
    tournaments: true
  });
  const {
    setModifiedTournaments,
    local: { event, tournaments }
  } = state;

  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TournamentRemovalDialog);
  const { requireElevation } = useElevatedAction();

  const remoteUrl = useAtomValue(remoteApiUrlAtom);

  useUpdateAppbar(
    {
      title: event ? `${event.eventName} | Tournament Manager` : undefined,
      titleLink: event ? `/${event.eventKey}` : undefined
    },
    [event]
  );

  const handleSave = async () => {
    try {
      if (!event) return;
      const diffs = getDifferences(
        state.local.tournaments,
        state.remote.tournaments,
        'tournamentKey'
      );
      if (diffs.additions.length > 0) {
        await tournamentsApi.create.tournaments(diffs.additions);
      }
      for (const tournament of diffs.edits) {
        await tournamentsApi.update.tournament(tournament);
      }

      setModifiedTournaments([]);

      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Tournaments successfully uploaded`
      );
    } catch (e) {
      showErrorSnackbar('Error while uploading tournaments.', e);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setModifiedTournaments((prev) => [
      ...prev,
      {
        ...defaultTournament,
        eventKey,
        tournamentKey: `t${tournaments.length + 1}`,
        name: ''
      }
    ]);
  };

  const handleRevert = async () => {
    if (!event) return;
    setModifiedTournaments([]);
  };

  const handleEdit = (tournament: Tournament) => {
    navigate(
      `/${event?.eventKey}/tournament-manager/edit/${tournament.tournamentKey}`
    );
  };

  const handleDelete = async (tournament: Tournament) => {
    if (!event) return;
    const confirmed = await removeModal.show({ tournament });
    if (!confirmed) return;

    // Check if this tournament has never been saved to the database.
    const isStagedOnly = !state.remote.tournaments.some(
      (t) => t.tournamentKey === tournament.tournamentKey
    );

    // For staged-only, just drop it locally, no password needed.
    if (isStagedOnly) {
      setModifiedTournaments((prev) =>
        prev.filter((t) => t.tournamentKey !== tournament.tournamentKey)
      );
      return;
    }

    // A persisted tournament goes through the API and requires the password.
    if (!(await requireElevation())) return;

    try {
      await tournamentsApi.delete.tournament(
        event.eventKey,
        tournament.tournamentKey
      );
      setModifiedTournaments((prev) =>
        prev.filter((t) => t.tournamentKey !== tournament.tournamentKey)
      );
      await mutate(['/tournament', event.eventKey]);
      showSnackbar(
        `Deleted tournament ${tournament.name || tournament.tournamentKey}`
      );
    } catch (e) {
      showErrorSnackbar('Error while deleting tournament.', e);
    }
  };

  const handleDownload = async () => {
    try {
      if (!event?.eventKey) return;
      remoteClient.setBaseUrl(normalizeRemoteApiHost(remoteUrl));
      const tournaments =
        (await remoteClient.get<Tournament[]>(`/tournament/${event.eventKey}`, {
          schema: tournamentZod.array()
        })) ?? [];
      setModifiedTournaments(tournaments);
      showSnackbar(`(${tournaments.length}) Teams successfully downloaded`);
    } catch (e) {
      showErrorSnackbar('Error while downloading teams.', e);
    }
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={
            <Typography.Title level={3}>Tournament Manager</Typography.Title>
          }
          right={
            <MoreButton
              menuItems={[
                {
                  key: '1',
                  label: <a onClick={handleSave}>Save Tournaments</a>
                },
                { key: '2', label: <a onClick={handleAdd}>Add Tournament</a> },
                {
                  key: '3',
                  label: <a onClick={handleRevert}>Revert Changes</a>
                },
                {
                  key: '4',
                  label: <a onClick={handleDownload}>Download Tournaments</a>
                }
              ]}
            />
          }
        />
      }
      showSettings
    >
      <Suspense>
        {event && (
          <TournamentTable
            event={event}
            tournaments={tournaments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        )}
      </Suspense>
    </PaperLayout>
  );
};
