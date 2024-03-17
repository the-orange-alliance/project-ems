import { FC } from 'react';
import Grid from '@mui/material/Grid';
import TeamCardStatus from './TeamCardStatus';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import AutocompleteTeam from 'src/components/dropdowns/AutoCompleteTeam';
import {
  CardStatusUpdate,
  MatchSocketEvent,
  MatchState,
  Team
} from '@toa-lib/models';
import {
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
  const state = useRecoilValue(matchStateAtom);

  const [socket] = useSocket();

  const handleCardStatusChange = (cardStatus: number) => {
    if (participant) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.cardStatus = cardStatus;
      setParticipant(newParticipant);
      const updateCardPacket: CardStatusUpdate = {
        teamKey: participant.teamKey,
        cardStatus
      };
      socket?.emit(MatchSocketEvent.UPDATE_CARD_STATUS, updateCardPacket);
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
      <Grid item xs={12} sm={6}>
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
          onChange={handleCardStatusChange}
        />
      </Grid>
    </Grid>
  );
};

export default TeamStatusRow;
