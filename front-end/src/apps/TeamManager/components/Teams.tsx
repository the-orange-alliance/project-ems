import { FC, ChangeEvent, useState } from 'react';
import Box from '@mui/material/Typography';
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
import UploadButton from 'src/components/UploadButton/UploadButton';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';
import { parseTeamsFile } from '@features/util/FileParser';
import { Team, defaultTeam } from '@toa-lib/models';
import { getDifferences, removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import { useSnackbar } from 'src/features/hooks/use-snackbar';
import TeamRemovalDialog from 'src/components/Dialogs/TeamRemovalDialog';
import { deleteTeam, patchTeam, postTeams } from 'src/api/ApiProvider';
import {Save, Upload, ExpandLess} from '@mui/icons-material';
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import ViewReturn from 'src/components/ViewReturn/ViewReturn';

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

  if (!event) return null;

  const handlePost = useRecoilCallback(({ snapshot }) => async () => {
    try {
      const prevTeams = await snapshot.getPromise(
        teamsByEventSelectorFam(event.eventKey)
      );
      const diffs = getDifferences(teams, prevTeams, 'teamKey');
      setLoading(true);
      await Promise.all([
        postTeams(diffs.additions),
        diffs.edits.map((e) => patchTeam(e.teamKey, e))
      ]);
      await setFlags('createdTeams', [...flags.createdTeams, event.eventKey]);
      setLoading(false);
      showSnackbar(
        `(${diffs.additions.length + diffs.edits.length
        }) Teams successfully uploaded`
      );
    } catch (e) {
      setLoading(false);
    }
  });

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    console.log("here", files)
    if (!files || files.length <= 0 || !event) return;
    e.preventDefault();
    const teams = await parseTeamsFile(files[0], event.eventKey);
    setTeams(teams);
  };

  const handleCreate = () => {
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

  return (
    <>
      <ViewReturn title='Event' onClick={() => { }} href={`/${event.eventKey}`} />
      <Box
        sx={{
          marginBottom: (theme) => theme.spacing(3),
          display: 'flex',
          justifyContent: 'flex-end',
          gap: (theme) => theme.spacing(2)
        }}
      >
        <SpeedDial
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<ExpandLess />}
          ariaLabel={'add event'}
        >
          <SpeedDialAction tooltipTitle={"Add Blank Team"} onClick={handleCreate} icon={<SpeedDialIcon />} />
          {!createdTeams && (
            <SpeedDialAction
              tooltipTitle={"Add Teams from File"}
              icon={(<><Upload /><input type="file" hidden onChange={handleUpload} /></>)}
              // @ts-ignore - I don't know why this is complaining
              FabProps={{ component: "label" }}
            />
          )}
          <SpeedDialAction tooltipTitle={"Save Teams"} onClick={handlePost} icon={<Save />} />
        </SpeedDial>
      </Box>
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
