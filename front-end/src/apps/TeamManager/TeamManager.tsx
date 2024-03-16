import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Teams from './components/Teams';
import TeamForm from 'src/components/TeamForm/TeamForm';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { currentTeamKeyAtom, currentTeamSelector } from 'src/stores/NewRecoil';
import { Team } from '@toa-lib/models';

const TeamManager: FC = () => {
  const [teamKey, setTeamKey] = useRecoilState(currentTeamKeyAtom);
  const setTeam = useSetRecoilState(currentTeamSelector);

  const handleSubmit = (team: Team) => {
    setTeam(team);
    setTeamKey(null);
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Team Manager</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        {!teamKey && <Teams />}
        {teamKey && <TeamForm onSubmit={handleSubmit} />}
      </Box>
    </PaperLayout>
  );
};
export default TeamManager;
