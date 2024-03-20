import { useModal } from '@ebay/nice-modal-react';
import { Typography } from '@mui/material';
import { Team, defaultTeam } from '@toa-lib/models';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentEvent } from 'src/api/use-event-data';
import { patchTeam, postTeams, useTeamsForEvent } from 'src/api/use-team-data';
import TeamRemovalDialog from 'src/components/dialogs/TeamRemovalDialog';
import { PageLoader } from 'src/components/loading/PageLoader';
import { UnsavedChangesEffect } from 'src/components/sync-effects/UnloadEffect';
import { TeamsTable } from 'src/components/tables/teams-table';
import SaveAddUploadLoadingFab from 'src/components/util/SaveAddUploadLoadingFab';
import { useSnackbar } from 'src/hooks/use-snackbar';
import PaperLayout from 'src/layouts/PaperLayout';
import { getDifferences } from 'src/stores/Util';
import { parseTeamsFile } from 'src/util/FileParser';

export const TeamManager: FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: initialTeams } = useTeamsForEvent(event?.eventKey);

  const [teams, setTeams] = useState<Team[]>(initialTeams ?? []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  useEffect(() => {
    if (initialTeams) setTeams(initialTeams);
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
    setHasUnsavedChanges(true);
  };

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    console.log('ALDKASLDKFJ');
    const { files } = e.target;
    if (!files || files.length <= 0 || !event) return;
    e.preventDefault();
    const importedTeams = await parseTeamsFile(files[0], event.eventKey);
    setTeams(importedTeams);
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  return event && initialTeams ? (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Team Manager</Typography>}
      padding
      showSettings
    >
      <UnsavedChangesEffect hasUnsavedChanges={hasUnsavedChanges} />
      <TeamsTable
        event={event}
        teams={teams}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <SaveAddUploadLoadingFab
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
      />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
