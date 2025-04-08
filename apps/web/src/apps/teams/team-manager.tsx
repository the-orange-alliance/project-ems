import { useModal } from '@ebay/nice-modal-react';
import { Typography } from 'antd';
import { Team, defaultTeam } from '@toa-lib/models';
import { ChangeEvent, FC, useState, useEffect, Suspense } from 'react';
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

export const TeamManager: FC = () => {
  const { loading: stateLoading, state } = useEventState({
    event: true,
    teams: true
  });
  const { platform, apiKey } = useSyncConfig();
  const [teams, setTeams] = useState<Team[]>([]);

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  useEffect(() => setTeams(state.teams), [state.teams]);
  useUpdateAppbar(
    {
      title: state.event
        ? `${state.event.eventName} | Team Manager`
        : undefined,
      titleLink: state.event ? `/${state.event.eventKey}` : undefined
    },
    [state.event]
  );

  const handleSave = async () => {
    try {
      if (!state.event) return;
      const diffs = getDifferences(teams, state.teams, 'teamKey');
      if (diffs.additions.length > 0) {
        await postTeams(state.event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await patchTeam(team.eventKey, team.teamKey, team);
      }
      await resultsSyncTeams(state.event.eventKey, platform, apiKey);

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
    if (!state.event) return;
    const { eventKey } = state.event;
    setTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: teams.length + 1 },
      ...prev
    ]);
  };

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    if (!files || files.length <= 0 || !state.event) return;
    e.preventDefault();
    const importedTeams = await parseTeamsFile(files[0], state.event.eventKey);
    setTeams(importedTeams);
  };

  const handleEdit = (team: Team) => {
    if (!state.event) return;
    navigate(`/${state.event.eventKey}/team-manager/edit/${team.teamKey}`);
  };

  const handleDelete = async (team: Team) => {
    const confirmRemove = await removeModal.show({ team });
    if (confirmRemove) {
      setTeams((prevTeams) =>
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
                }
              ]}
            />
          }
        />
      }
      showSettings
    >
      <Suspense>
        {state.event && (
          <TeamsTable
            event={state.event}
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
