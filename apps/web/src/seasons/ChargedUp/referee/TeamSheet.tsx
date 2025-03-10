import { FC, useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { matchOccurringAtom } from '@stores/recoil';
import { useSocket } from 'src/api/use-socket';
import { MatchParticipant, MatchSocketEvent } from '@toa-lib/models';

interface Props {
  station: number;
}

const TeamSheet: FC<Props> = ({ station }) => {
  const [socket] = useSocket();
  const [match, setMatch] = useRecoilState(matchOccurringAtom);
  const participant = match?.participants?.find((p) => p.station === station);

  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (updateReady) {
      socket?.emit(MatchSocketEvent.UPDATE, match);
      setUpdateReady(false);
    }
  }, [updateReady]);

  const setParticipant = (participant: MatchParticipant) => {
    if (match && match.participants) {
      setMatch(
        Object.assign(
          {},
          {
            ...match,
            participants: match.participants.map((p) =>
              p.station === station ? participant : p
            )
          }
        )
      );
    }
  };

  const handleCardChange = (cardStatus: number) => {
    if (participant) {
      setParticipant(Object.assign({}, { ...participant, cardStatus }));
      setUpdateReady(true);
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
      <Typography variant='h6'>{participant?.teamKey}</Typography>

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
