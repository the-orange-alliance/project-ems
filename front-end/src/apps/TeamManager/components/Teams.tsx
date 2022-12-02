import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Typography';
import Button from '@mui/material/Button';
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

import AddIcon from '@mui/icons-material/Add';

const Teams: FC = () => {
  // Recoil state
  const event = useRecoilValue(currentEventSelector);
  const [teams, setTeams] = useRecoilState(
    teamsByEventAtomFam(event?.eventKey ?? '')
  );
  const setTeamKey = useSetRecoilState(currentTeamKeyAtom);

  // Custom hooks
  const [flags, setFlag] = useFlags();

  // Local variables
  const createdTeams = flags.createdTeams.includes(event?.eventKey ?? '');

  if (!event) return null;

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

  const handleSelect = (t: Team) => {
    setTeamKey(t.teamKey);
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
          <Button variant='contained' disabled={teams.length <= 0}>
            Upload Teams
          </Button>
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
          'Robot',
          'Location',
          'Country Code',
          'Rookie Year'
        ]}
        renderRow={(t) => {
          const { eventName } = event;
          const location = [t.city, t.stateProv, t.country]
            .filter((str) => str.length > 0)
            .toString();
          return [
            eventName,
            t.teamKey,
            t.teamNameShort,
            t.teamNameLong,
            t.robotName,
            location,
            t.countryCode,
            t.rookieYear
          ];
        }}
        onSelect={handleSelect}
      />
    </>
  );
};

export default Teams;
