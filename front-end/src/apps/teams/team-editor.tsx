import { Typography } from '@mui/material';
import { Team } from '@toa-lib/models';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useCurrentEvent } from 'src/api/use-event-data';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';
import { TeamForm } from 'src/components/forms/team-form';
import { PageLoader } from 'src/components/loading/PageLoader';
import { useSnackbar } from 'src/hooks/use-snackbar';
import PaperLayout from 'src/layouts/PaperLayout';
import { currentTeamKeyAtom } from 'src/stores/recoil';
import { teamsByEventKeyAtomFam } from 'src/stores/recoil/event-state';

export const TeamEdior: FC = () => {
  const { data: event } = useCurrentEvent();
  const teamKey = useRecoilValue(currentTeamKeyAtom);
  const [teams, setTeams] = useRecoilState(
    teamsByEventKeyAtomFam(event?.eventKey ?? '')
  );
  const team = teams.find((t) => t.teamKey === teamKey);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const onSubmit = async (team: Team) => {
    setTeams((prev) =>
      prev.map((t) => (t.teamKey === team.teamKey ? team : t))
    );
    showSnackbar(`Modified team ${team.teamKey}`);
    navigate(`/${team.eventKey}/team-manager`);
  };
  return event ? (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Event Creation</Typography>}
      padding
      showSettings
    >
      <ViewReturn title='Teams' href={`/${event.eventKey}/team-manager`} />
      <TeamForm initialTeam={team} onSubmit={onSubmit} />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
