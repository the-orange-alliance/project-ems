import { Typography } from 'antd';
import { Tournament, defaultTournament } from '@toa-lib/models';
import { FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  patchTournament,
  postTournaments
} from 'src/api/use-tournament-data.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TournamentTable } from 'src/components/tables/tournament-table.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { getDifferences } from 'src/stores/array-utils.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';

export const TournamentManager: FC = () => {
  const { loading, state } = useEventState({
    event: true,
    tournaments: true
  });
  const {
    setModifiedTournaments,
    local: { event, tournaments }
  } = state;

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

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
        await postTournaments(diffs.additions);
      }
      for (const tournament of diffs.edits) {
        await patchTournament(tournament);
      }

      setModifiedTournaments([]);

      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Tournaments successfully uploaded`
      );
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading tournaments.', error);
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
        tournamentKey: `t${prev.length + 1}`,
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
            loading={loading}
          />
        )}
      </Suspense>
    </PaperLayout>
  );
};
