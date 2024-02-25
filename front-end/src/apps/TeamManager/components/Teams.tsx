import { FC, ChangeEvent, useState } from 'react';
import {
  useRecoilValue,
  useRecoilState,
  useSetRecoilState,
  useRecoilCallback
} from 'recoil';
import {
  currentEventSelector,
  currentTeamKeyAtom,
  teamsByEventAtomFam,
  teamsByEventSelectorFam
} from 'src/stores/NewRecoil';
import { useFlags } from 'src/stores/AppFlags';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';
import { parseTeamsFile } from '@features/util/FileParser';
import { Team, defaultTeam } from '@toa-lib/models';
import { getDifferences, removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import { useSnackbar } from 'src/features/hooks/use-snackbar';
import TeamRemovalDialog from 'src/components/Dialogs/TeamRemovalDialog';
import { patchTeam, postTeams } from 'src/api/ApiProvider';
import ViewReturn from 'src/components/ViewReturn/ViewReturn';
import SaveAddUploadLoadingFab from 'src/features/components/SaveAddUploadLoadingFab';

const Teams: FC = () => {
  // Recoil State
  const event = useRecoilValue(currentEventSelector);
  const [teams, setTeams] = useRecoilState(
    teamsByEventAtomFam(event?.eventKey ?? '')
  );
  const setTeamKey = useSetRecoilState(currentTeamKeyAtom);

  // Local State
  const [loading, setLoading] = useState(false);

  // Custom Hooks
  const { showSnackbar } = useSnackbar();
  const [flags, setFlags] = useFlags();

  // Dialogs
  const removeModal = useModal(TeamRemovalDialog);

  // Local Variables
  const createdTeams = flags.createdTeams.includes(event?.eventKey ?? '');

  const handlePost = useRecoilCallback(({ snapshot }) => async () => {
    try {
      if (!event) return;
      const prevTeams = await snapshot.getPromise(
        teamsByEventSelectorFam(event.eventKey)
      );
      const diffs = getDifferences(teams, prevTeams, 'teamKey');
      setLoading(true);
      if (diffs.additions.length > 0) {
        await postTeams(event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await patchTeam(team.eventKey, team.teamKey, team);
      }
      await setFlags('createdTeams', [...flags.createdTeams, event.eventKey]);
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
  });

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    if (!files || files.length <= 0 || !event) return;
    e.preventDefault();
    const teams = await parseTeamsFile(files[0], event.eventKey);
    setTeams(teams);
  };

  const handleCreate = () => {
    if (!event) return;
    const { eventKey } = event;
    setTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: teams.length + 1 },
      ...prev
    ]);
  };

  const handleModify = (t: Team) => {
    setTeamKey(t.teamKey);
  };

  const handleDelete = async (t: Team) => {
    const confirm = await removeModal.show({ team: t });
    if (confirm) {
      setTeams(removeFromArray(teams, 'teamKey', t.teamKey));
    }
  };

  if (!event) return null;

  return (
    <>
      <ViewReturn title='Event' href={`/${event.eventKey}`} sx={{ mb: 1 }} />
      <SaveAddUploadLoadingFab
        onSave={handlePost}
        onAdd={handleCreate}
        onUpload={handleUpload}
        loading={loading}
        canAdd
        canUpload={!createdTeams}
        canSave
        addTooltip='Add Empty Team'
        uploadTooltip='Upload Teams from File'
        saveTooltip='Save Teams'
      />
      <UpgradedTable
        data={teams}
        headers={[
          'Event',
          'Team',
          'Short Name',
          'Long Name',
          'Location',
          'Country Code',
          'Rookie Year'
        ]}
        renderRow={(t) => {
          const { eventName } = event;
          const location = [t.city, t.stateProv, t.country]
            .filter((str) => str.length > 0)
            .toString();
          const flag = (
            <div>
              <span
                className={`flag-icon flag-icon-${t.countryCode.toLowerCase()}`}
              />
              &nbsp;({t.countryCode})
            </div>
          );
          return [
            eventName,
            t.teamKey,
            t.teamNameShort,
            t.teamNameLong,
            location,
            flag,
            t.rookieYear
          ];
        }}
        onModify={handleModify}
        onDelete={!createdTeams ? handleDelete : undefined}
      />
    </>
  );
};

export default Teams;
