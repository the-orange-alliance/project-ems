import { useModal } from '@ebay/nice-modal-react';
import { Typography } from 'antd';
import { Team, defaultTeam } from '@toa-lib/models';
import { ChangeEvent, FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultsSyncTeams } from 'src/api/use-results-sync.js';
import { patchTeam, postTeams } from 'src/api/use-team-data.js';
import { TeamRemovalDialog } from 'src/components/dialogs/team-removal-dialog.js';
import { TeamsTable } from 'src/components/tables/teams-table.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { getDifferences } from 'src/stores/array-utils.js';
import { parseTeamsFile } from 'src/util/file-parser.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';
import { UploadButton } from 'src/components/buttons/upload-button.js';
import { useSWRConfig } from 'swr';

export const TeamManager: FC = () => {
  const { mutate } = useSWRConfig();
  const { loading: stateLoading, state } = useEventState({
    event: true,
    teams: true
  });
  const {
    setModifiedTeams,
    local: { event, teams }
  } = state;

  const { platform, apiKey } = useSyncConfig();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  useUpdateAppbar(
    {
      title: event ? `${event.eventName} | Team Manager` : undefined,
      titleLink: event ? `/${event.eventKey}` : undefined
    },
    [event]
  );

  const handleSave = async () => {
    try {
      if (!event) return;
      const diffs = getDifferences(
        state.local.teams,
        state.remote.teams,
        'teamKey'
      );
      if (diffs.additions.length > 0) {
        await postTeams(event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await patchTeam(team.eventKey, team.teamKey, team);
      }
      await resultsSyncTeams(event.eventKey, platform, apiKey);

      await mutate(`teams/${event.eventKey}`);
      setModifiedTeams([]);

      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Teams successfully uploaded`
      );
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading team.', error);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setModifiedTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: state.staged.teams.length + 1 },
      ...prev
    ]);
  };

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    if (!files || files.length <= 0 || !event) return;
    e.preventDefault();
    const importedTeams = await parseTeamsFile(files[0], event.eventKey);
    setModifiedTeams(importedTeams);
  };

  const handleRevert = async () => {
    if (!event) return;
    await mutate(`teams/${event.eventKey}`);
    setModifiedTeams([]);
  };

  const handleEdit = (team: Team) => {
    if (!event) return;
    navigate(`/${event.eventKey}/team-manager/edit/${team.teamKey}`);
  };

  const handleDelete = async (team: Team) => {
    const confirmRemove = await removeModal.show({ team });
    if (confirmRemove) {
      setModifiedTeams((prevTeams) =>
        prevTeams.filter((t) => t.teamKey !== team.teamKey)
      );
    }
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Team Manager</Typography.Title>}
          right={
            <MoreButton
              menuItems={[
                { key: '1', label: <a onClick={handleSave}>Save Teams</a> },
                { key: '2', label: <a onClick={handleAdd}>Add Team</a> },
                {
                  key: '3',
                  label: (
                    <UploadButton
                      title='Upload Teams'
                      onUpload={handleUpload}
                    />
                  )
                },
                {
                  key: '4',
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
          <TeamsTable
            event={event}
            teams={teams}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={stateLoading}
          />
        )}
      </Suspense>
    </PaperLayout>
  );
};
