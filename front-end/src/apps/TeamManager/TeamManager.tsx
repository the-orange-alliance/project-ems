import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Teams from './components/Teams';
import TeamForm from 'src/components/forms/TeamForm/TeamForm';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  currentEventKeyAtom,
  currentTeamKeyAtom,
  currentTeamSelector
} from 'src/stores/NewRecoil';
import { Team } from '@toa-lib/models';
import { useEvent } from 'src/api/use-event-data';
import { PageLoader } from 'src/components/loading/PageLoader';

const TeamManager: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: event } = useEvent(eventKey);
  const [teamKey, setTeamKey] = useRecoilState(currentTeamKeyAtom);
  const setTeam = useSetRecoilState(currentTeamSelector);
  const handleSubmit = (team: Team) => {
    setTeam(team);
    setTeamKey(null);
  };
  return event ? (
    <PaperLayout
      containerWidth='xl'
      title={`${event?.eventName} | Team Manager`}
      titleLink={`/${event?.eventKey}`}
      padding
      showSettings
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        {!teamKey && <Teams />}
        {teamKey && <TeamForm onSubmit={handleSubmit} />}
      </Box>
    </PaperLayout>
  ) : (
    <PageLoader />
  );
};
export default TeamManager;
