import { FC } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { CardStatusUpdate, Match, MatchParticipant, MatchSocketEvent } from '@toa-lib/models';
import { useSocket } from 'src/api/use-socket';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import { matchOccurringAtom } from 'src/stores/recoil';

interface Props {
  station: number;
}

const TeamSheet: FC<Props> = ({ station }) => {
  const [socket] = useSocket();
  const [match, setMatch]: [
    Match<any> | null,
    SetterOrUpdater<Match<any> | null>
  ] = useRecoilState(matchOccurringAtom);

  const identifiers = useTeamIdentifiers();
  const participant = match?.participants?.find(p => p.station === station);

  const setParticipant = (participant: MatchParticipant) => {
    if (match && match.participants) {
      setMatch(
        Object.assign({}, { ...match, participants: match.participants.map(p => (p.station === station ? participant : p)) })
      );
    }
  };

  const handleCardChange = (cardStatus: number) => {
    if (participant) {
      setParticipant(Object.assign({}, { ...participant, cardStatus }));
      const updateCardPacket: CardStatusUpdate = {
        teamKey: participant.teamKey,
        cardStatus
      };
      socket?.emit(MatchSocketEvent.UPDATE_CARD_STATUS, updateCardPacket);
    }
  };

  const handleYellow = () => {
    handleCardChange(participant?.cardStatus === 1 ? 0 : 1);
  };

  const handleRed = () => {
    handleCardChange(participant?.cardStatus === 2 ? 0 : 2);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center'
      }}
    >
      {participant && (
        <Typography variant='h6'>{identifiers[participant.teamKey]}</Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          width: '100%'
        }}
      >
        <ToggleButton
          fullWidth
          value='yellowCard'
          selected={participant?.cardStatus == 1}
          onChange={handleYellow}
          color='warning'
        >
          Yellow Card
        </ToggleButton>
        <ToggleButton
          fullWidth
          value='redCard'
          selected={participant?.cardStatus == 2}
          onChange={handleRed}
          color='error'
        >
          Red Card
        </ToggleButton>
      </Box>
    </Box>
  );
};

export default TeamSheet;
