import { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import {
  useRecoilCallback,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState
} from 'recoil';
import {
  AllianceMember,
  defaultAllianceMember,
  MatchSocketEvent,
  Team
} from '@toa-lib/models';
import AutocompleteTeam from 'src/features/components/AutocompleteTeam/AutoCompleteTeam';
import { replaceInArray } from 'src/stores/Util';
import { postAllianceMembers } from 'src/api/ApiProvider';
import { useSocket } from 'src/api/SocketProvider';
import {
  allianceMembersByTournamentSelector,
  currentEventKeyAtom,
  currentScheduleByTournamentSelector,
  currentScheduledTeamsSelector,
  currentTeamsByEventSelector,
  currentTournamentKeyAtom
} from 'src/stores/NewRecoil';

const SetupAlliances: FC = () => {
  const setSchedule = useSetRecoilState(currentScheduleByTournamentSelector);
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const [allianceMembers, setAllianceMembers] = useRecoilState(
    allianceMembersByTournamentSelector
  );
  const [socket] = useSocket();

  const generateSlots = () => {
    if (!tournamentKey) return;
    const newMembers: AllianceMember[] = [];
    for (let i = 0; i < 4; i++) {
      newMembers.push({
        ...defaultAllianceMember,
        eventKey,
        allianceRank: allianceMembers.length / 4 + 1,
        isCaptain: i === 0,
        pickOrder: i + 1,
        tournamentKey
      });
    }
    setAllianceMembers((prev) => [...prev, ...newMembers]);
  };

  const postAlliances = useRecoilCallback(({ snapshot, set }) => async () => {
    const teams = await snapshot.getPromise(currentTeamsByEventSelector);
    setSchedule((prev) => ({
      ...prev,
      teamsParticipating: allianceMembers.length,
      playoffsOptions: {
        allianceCount: allianceMembers.filter((a) => a.isCaptain).length
      }
    }));
    set(
      currentScheduledTeamsSelector,
      teams.filter((t) => allianceMembers.find((a) => a.teamKey === t.teamKey))
    );
    await postAllianceMembers(eventKey, allianceMembers);
  });

  const setDisplay = () => {
    socket?.emit(MatchSocketEvent.DISPLAY, 6);
  };

  const updateDisplay = () => {
    socket?.emit(MatchSocketEvent.ALLIANCE, allianceMembers);
  };

  return (
    <Box sx={{ padding: (theme) => theme.spacing(3) }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={12} md={3}>
          <Button variant='contained' onClick={generateSlots}>
            Generate Alliance Slots
          </Button>
        </Grid>
        <Grid item xs={12} sm={12} md={3}>
          <Button variant='contained' onClick={setDisplay}>
            Show Alliance Screen
          </Button>
        </Grid>
        <Grid item xs={12} sm={12} md={3}>
          <Button variant='contained' onClick={updateDisplay}>
            Update Alliance Screen
          </Button>
        </Grid>
        <Grid item xs={12} sm={12} md={3} />
        {allianceMembers.map((a, i) => {
          const onUpdate = (team: Team | null) => {
            if (team) {
              const newMembers = replaceInArray<AllianceMember>(
                allianceMembers,
                'teamKey',
                a.teamKey,
                { ...a, teamKey: team.teamKey }
              );
              setAllianceMembers(newMembers ? newMembers : []);
            }
          };

          return (
            <Grid
              key={`${a.eventKey}-${a.tournamentKey}-${a.allianceRank}-${a.teamKey}-${i}`}
              item
              xs={12}
              sm={6}
              md={3}
            >
              <AutocompleteTeam
                teamKey={a.teamKey === -1 ? null : a.teamKey}
                onUpdate={onUpdate}
              />
            </Grid>
          );
        })}
        {allianceMembers.length > 0 && (
          <Grid item xs={12} sm={12} md={3}>
            <Button variant='contained' onClick={postAlliances}>
              Post Alliances
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SetupAlliances;
