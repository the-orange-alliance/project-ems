import { Typography } from '@mui/material';
import { Team } from '@toa-lib/models';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import { TeamForm } from 'src/components/forms/team-form';
import { useSnackbar } from 'src/hooks/use-snackbar';
import PaperLayout from 'src/layouts/PaperLayout';

export const TeamCreation: FC = () => {
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const onSubmit = async (team: Team) => {
    showSnackbar(`Added team ${team.teamKey}`);
    navigate(`/${team.eventKey}/teams`);
  };
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Creation</Typography>}
      padding
      showSettings
    >
      <ViewReturn title='Events' href='/' />
      <TeamForm onSubmit={onSubmit} />
    </PaperLayout>
  );
};
