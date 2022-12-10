import { FC, ChangeEvent, useState } from 'react';
import Box from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import {
  currentEventSelector,
  currentTeamKeyAtom,
  teamsByEventAtomFam
} from 'src/stores/NewRecoil';
import { useFlags } from 'src/stores/AppFlags';
import UploadButton from 'src/components/UploadButton/UploadButton';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';
import { parseTeamsFile } from '@features/util/FileParser';
import { Team, defaultTeam } from '@toa-lib/models';
import { removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import { useSnackbar } from 'src/features/hooks/use-snackbar';
import TeamRemovalDialog from 'src/components/Dialogs/TeamRemovalDialog';

import AddIcon from '@mui/icons-material/Add';
import { postTeams } from 'src/api/ApiProvider';

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

  const handlePost = async () => {
    try {
      setLoading(true);
      await postTeams(teams);
      await setFlags('createdTeams', [...flags.createdTeams, event.eventKey]);
      setLoading(false);
      showSnackbar('Teams successfully created');
    } catch (e) {
      setLoading(false);
    }
  };

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
    const { eventKey } = event;
    setTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: teams.length },
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
      <Box
        sx={{
          marginBottom: (theme) => theme.spacing(3),
          display: 'flex',
          justifyContent: 'flex-end',
          gap: (theme) => theme.spacing(2)
        }}
      >
        {!createdTeams && (
          <LoadingButton
            loading={loading}
            variant='contained'
            disabled={teams.length <= 0}
            onClick={handlePost}
          >
            Upload Teams
          </LoadingButton>
        )}
        {!createdTeams && (
          <Button
            variant='contained'
            sx={{ paddinG: '6px', minWidth: '24px' }}
            onClick={handleCreate}
          >
            <AddIcon />
          </Button>
        )}
        {!createdTeams && (
          <UploadButton title='Upload Teams' onUpload={handleUpload} />
        )}
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
        onDelete={handleDelete}
      />
    </>
  );
};

export default Teams;
