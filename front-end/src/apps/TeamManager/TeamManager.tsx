import { ChangeEvent, FC, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import DefaultLayout from 'src/layouts/DefaultLayout';
import UploadButton from 'src/components/UploadButton/UploadButton';
import TeamsTable from 'src/features/components/TeamsTable/TeamsTable';
import { Team } from '@toa-lib/models';

const TeamManager: FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!e.target.files || e.target.files.length <= 0) return;

    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (file: ProgressEvent<FileReader>): Promise<void> => {
      if (!file.target || !file.target.result) return;

      const teams: Team[] = file.target.result
        .toString()
        .split('\n')
        .map((team) => {
          const t = team.split(',');
          return {
            teamKey: t[0],
            eventParticipantKey: t[1],
            teamNameLong: t[2],
            teamNameShort: '',
            robotName: '',
            city: t[5],
            stateProv: '',
            country: t[6],
            countryCode: t[7],
            cardStatus: 0,
            hasCard: false,
            rookieYear: ''
          };
        });
      setTeams(teams);
    };
    reader.readAsText(e.target.files[0]);
  };

  return (
    <DefaultLayout containerWidth='lg'>
      <Paper>
        <Box
          sx={{
            padding: (theme) => theme.spacing(2),
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant='h4'>Team Manager</Typography>
          <UploadButton title='Upload Teams' onUpload={handleUpload} />
        </Box>
        <Divider />
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <TeamsTable teams={teams} />
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default TeamManager;
