import { useModal } from '@ebay/nice-modal-react';
import { Typography } from 'antd';
import { Team, defaultTeam } from '@toa-lib/models';
import { useAtom } from 'jotai';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentEvent } from 'src/api/use-event-data.js';
import { resultsSyncTeams } from 'src/api/use-results-sync.js';
import {
  patchTeam,
  postTeams,
  useTeamsForEvent
} from 'src/api/use-team-data.js';
import { TeamRemovalDialog } from 'src/components/dialogs/team-removal-dialog.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { TeamsTable } from 'src/components/tables/teams-table.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { getDifferences } from 'src/stores/array-utils.js';
import { teamsAtom } from 'src/stores/state/index.js';
import { parseTeamsFile } from 'src/util/file-parser.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';

export const TeamManager: FC = () => {
  const { data: event, isLoading: isLoadingEvent } = useCurrentEvent();
  const { data: initialTeams, isLoading: isLoadingTeams } = useTeamsForEvent(
    event?.eventKey
  );
  const { platform, apiKey } = useSyncConfig();
  const [teams, setTeams] = useAtom(teamsAtom);
  const [loading, setLoading] = useState(false);

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  useEffect(() => {
    if (!event) return;
    if (initialTeams && teams.length === 0) setTeams(initialTeams);
  }, [initialTeams]);

  const handleSave = async () => {
    try {
      if (!event || !initialTeams) return;
      const diffs = getDifferences(teams, initialTeams, 'teamKey');
      setLoading(true);
      if (diffs.additions.length > 0) {
        await postTeams(event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await patchTeam(team.eventKey, team.teamKey, team);
      }
      await resultsSyncTeams(event.eventKey, platform, apiKey);

      setLoading(false);
      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Teams successfully uploaded`
      );
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while uploading team.', error);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: teams.length + 1 },
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
    setTeams(importedTeams);
  };

  const handleEdit = (team: Team) => {
    navigate(`/${event?.eventKey}/team-manager/edit/${team.teamKey}`);
  };

  const handleDelete = async (team: Team) => {
    const confirmRemove = await removeModal.show({ team });
    if (confirmRemove) {
      setTeams((prevTeams) =>
        prevTeams.filter((t) => t.teamKey !== team.teamKey)
      );
    }
  };

  return event && initialTeams ? (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Team Manager</Typography.Title>}
          right={
            <MoreButton
              menuItems={[
                { key: '1', label: <a onClick={handleSave}>Save Teams</a> },
                { key: '2', label: <a onClick={handleAdd}>Add Team</a> }
                // { key: '1', label: <a onClick={handleUpload}> Teams</a> }
              ]}
            />
          }
        />
      }
      title={`${event.eventName} | Team Manager`}
      titleLink={`/${event.eventKey}`}
      showSettings
    >
      <TeamsTable
        event={event}
        teams={teams}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoadingTeams || isLoadingEvent}
      />
      {/* <SaveAddUploadLoadingFab
        onSave={handleSave}
        onAdd={handleAdd}
        onUpload={handleUpload}
        loading={loading}
        canAdd
        canSave
        canUpload
        addTooltip='Add Empty Team'
        uploadTooltip='Upload Teams from File'
        saveTooltip='Save Teams'
      /> */}
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
