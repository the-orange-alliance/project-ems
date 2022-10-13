import { FC, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useRecoilState } from 'recoil';
import { matchInProgress } from 'src/stores/Recoil';
import { CarbonCaptureDetails } from '@toa-lib/models';
import { useSocket } from 'src/api/SocketProvider';
import CarbonLevelInput from './CarbonLevelInput';
import MatchChip from 'src/components/MatchChip/MatchChip';
import ConnectionChip from 'src/components/ConnectionChip/ConnectionChip';

import {
  initAudio,
  MATCH_ABORT,
  MATCH_END,
  MATCH_ENDGAME,
  MATCH_START
} from 'src/apps/AudienceDisplay/Audio';

const startAudio = initAudio(MATCH_START);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

const ScoreSheet: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:start', matchStart);
      socket?.on('match:abort', matchAbort);
      socket?.on('match:endgame', matchEndGame);
      socket?.on('match:end', matchEnd);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:start', matchStart);
      socket?.removeListener('match:abort', matchAbort);
      socket?.removeListener('match:endgame', matchEndGame);
      socket?.removeListener('match:end', matchEnd);
    };
  }, []);

  const updateScore = (newScore: number) => {
    if (match && match.details) {
      const newMatch = {
        ...match,
        details: { ...match.details, carbonPoints: newScore }
      };
      socket?.emit('match:update', newMatch);
      setMatch(newMatch);
    }
  };

  const matchStart = () => {
    startAudio.play();
  };

  const matchAbort = () => {
    abortAudio.play();
  };

  const matchEndGame = () => {
    endgameAudio.play();
  };

  const matchEnd = () => {
    endAudio.play();
  };

  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2) }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center'
        }}
      >
        <Typography variant='h3'>Carbon Level</Typography>
        <Box className='center'>
          <ConnectionChip />
          <MatchChip match={match} />
        </Box>
        <CarbonLevelInput
          value={(match?.details as CarbonCaptureDetails)?.carbonPoints || 0}
          onChange={updateScore}
        />
      </Box>
    </Paper>
  );
};

export default ScoreSheet;
