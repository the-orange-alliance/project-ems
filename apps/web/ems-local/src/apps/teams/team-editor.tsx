import { Typography } from 'antd';
import { Team } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamForm } from 'src/components/forms/team-form.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { teamKeyAtom } from 'src/stores/state/index.js';

export const TeamEdior: FC = () => {
  const { state } = useEventState({ event: true, teams: true });
  const {
    setModifiedTeams,
    local: { event, teams }
  } = state;

  const teamKey = useAtomValue(teamKeyAtom);

  const team = teamKey
    ? teams.find((t) => t.teamKey === parseInt(teamKey))
    : undefined;

  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const onSubmit = async (team: Team) => {
    if (teams.length <= 0) return;

    const newModifiedTeams = state.staged.teams.find(
      (t) => t.teamKey === team.teamKey
    )
      ? state.staged.teams.map((t) => (t.teamKey === team.teamKey ? team : t))
      : [...state.staged.teams, team];
    setModifiedTeams(newModifiedTeams);
    showSnackbar(`Modified team ${team.teamKey}`);
    navigate(`/${team.eventKey}/team-manager`);
  };

  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography.Title level={3}>Team Editor</Typography.Title>}
      title={`${event?.eventName} | Team Manager | Edit Team`}
      titleLink={`/${event?.eventKey}`}
      showSettings
    >
      <TeamForm
        initialTeam={team}
        onSubmit={onSubmit}
        returnTo={`/${event?.eventKey}/team-manager`}
      />
    </PaperLayout>
  );
};
