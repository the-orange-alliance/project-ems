import { FC, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import TeamCardStatus from './TeamCardStatus';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import AutocompleteTeam from 'src/features/components/AutocompleteTeam/AutoCompleteTeam';
import { MatchSocketEvent, MatchState, Team } from '@toa-lib/models';
import {
  matchInProgressAtom,
  matchInProgressParticipantsByStationSelectorFam,
  matchStateAtom
} from 'src/stores/NewRecoil';

interface Props {
  station: number;
}

const TeamStatusRow: FC<Props> = ({ station }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantsByStationSelectorFam(station)
  );
  const match = useRecoilValue(matchInProgressAtom);
  const state = useRecoilValue(matchStateAtom);

  const [updateReady, setUpdateReady] = useState(false);
  const [socket] = useSocket();

  useEffect(() => {
    if (updateReady) {
      setUpdateReady(false);
      socket?.emit(MatchSocketEvent.UPDATE, match);
    }
  }, [updateReady]);

  const handleChange = (newValue: number) => {
    if (participant) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.cardStatus = newValue;
      setParticipant(newParticipant);
      setUpdateReady(true);
    }
  };

  const handleTeamChange = (team: Team | null) => {
    if (team) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.teamKey = team.teamKey;
      newParticipant.team = team;
      setParticipant(newParticipant);
    }
  };

  const disabled = state >= MatchState.PRESTART_COMPLETE;

  return (
    <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(1) }}>
      <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
        <AutocompleteTeam
          teamKey={participant ? participant.teamKey : null}
          disabled={disabled}
          onUpdate={handleTeamChange}
          white
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TeamCardStatus
          cardStatus={participant?.cardStatus || 0}
          onChange={handleChange}
        />
      </Grid>
    </Grid>
  );
};

export default TeamStatusRow;
