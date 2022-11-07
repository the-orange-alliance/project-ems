import { FC, ChangeEvent } from 'react';
import Box from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRecoilValue } from 'recoil';
import {
  currentEventSelector,
  teamsByEventAtomFam
} from 'src/stores/NewRecoil';
import { useFlags } from 'src/stores/AppFlags';
import UploadButton from 'src/components/UploadButton/UploadButton';

import AddIcon from '@mui/icons-material/Add';
import UpgradedTable from 'src/components/UpgradedTable/UpgradedTable';

const Teams: FC = () => {
  // Recoil state
  const event = useRecoilValue(currentEventSelector);
  const teams = useRecoilValue(teamsByEventAtomFam(event?.eventKey ?? ''));

  // Custom hooks
  const [flags, setFlag] = useFlags();

  // Local variables
  const createdTeams = flags.createdTeams.includes(event?.eventKey ?? '');

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    if (!files || files.length <= 0) return;
    e.preventDefault();
    console.log(files);
  };

  if (!event) return null;

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
        <Button variant='contained'>Save Changes</Button>
        {!createdTeams && (
          <Button variant='contained' sx={{ paddinG: '6px', minWidth: '24px' }}>
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
          const location = [event.city, event.stateProv, event.country]
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
      />
    </>
  );
};

export default Teams;
