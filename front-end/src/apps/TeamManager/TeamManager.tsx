import { ChangeEvent, FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DefaultLayout from 'src/layouts/DefaultLayout';
import UploadButton from 'src/components/UploadButton/UploadButton';
import TeamsTable from 'src/features/components/TeamsTable/TeamsTable';
import { Team } from '@toa-lib/models';
import TeamDialog from 'src/components/TeamDialog/TeamDialog';
import TeamRemovalDialog from 'src/components/TeamRemovalDialog/TeamRemovalDialog';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { teamDialogOpen, teamsAtom } from 'src/stores/Recoil';
import { postTeams } from 'src/api/ApiProvider';
import { useFlags } from 'src/stores/AppFlags';
import DefaultHeader from 'src/partials/DefaultHeader/DefaultHeader';

import AddIcon from '@mui/icons-material/Add';

const TeamManager: FC = () => {
  const setTeamDialogOpen = useSetRecoilState(teamDialogOpen);
  const [teams, setTeams] = useRecoilState(teamsAtom);

  const [flags, setFlag] = useFlags();

  const handleCreate = (): void => setTeamDialogOpen(true);

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!e.target.files || e.target.files.length <= 0) return;

    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (file: ProgressEvent<FileReader>): Promise<void> => {
      if (!file.target || !file.target.result) return;

      const importedTeams: Team[] = file.target.result
        .toString()
        .split('\n')
        .map((team) => {
          const t = team.split(',');
          return {
            teamKey: parseInt(t[0]),
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
            rookieYear: 2022
          };
        });
      setTeams(importedTeams);
    };
    reader.readAsText(e.target.files[0]);
  };

  const handleSave = async (): Promise<void> => {
    try {
      if (flags.createdTeams) {
        console.log('somehow detected other changes');
      } else {
        await postTeams(teams);
        await setFlag('createdTeams', true);
      }
    } catch (e) {
      // TODO - Better error-handling
      console.log(e);
    }
  };

  return (
    <DefaultLayout containerWidth='lg'>
      <TeamDialog />
      <TeamRemovalDialog />
      <DefaultHeader title='Team Manager'>
        <Box
          sx={{
            marginBottom: (theme) => theme.spacing(2),
            display: 'flex',
            justifyContent: 'flex-end',
            gap: (theme) => theme.spacing(2)
          }}
        >
          <Button variant='contained' onClick={handleSave}>
            Save Changes
          </Button>
          {!flags.createdTeams && (
            <Button
              variant='contained'
              sx={{ padding: '6px', minWidth: '24px' }}
              onClick={handleCreate}
            >
              <AddIcon />
            </Button>
          )}
          {!flags.createdTeams && (
            <UploadButton title='Upload Teams' onUpload={handleUpload} />
          )}
        </Box>
        <TeamsTable teams={teams} />
      </DefaultHeader>
    </DefaultLayout>
  );
};

export default TeamManager;
