import { Typography } from '@mui/material';
import { Team } from '@toa-lib/models';
import { useAtom, useAtomValue } from 'jotai';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentEvent } from 'src/api/use-event-data.js';
import { TeamForm } from 'src/components/forms/team-form.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { teamKeyAtom, teamsAtom } from 'src/stores/state/index.js';

export const TeamEdior: FC = () => {
  const { data: event } = useCurrentEvent();
  const teamKey = useAtomValue(teamKeyAtom);
  const [teams, setTeams] = useAtom(teamsAtom);
  const team = teamKey
    ? teams.find((t) => t.teamKey === parseInt(teamKey))
    : undefined;
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
      showSettings
    >
      <TeamForm
        initialTeam={team}
        onSubmit={onSubmit}
        returnTo={`/${event.eventKey}/team-manager`}
      />
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
