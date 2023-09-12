import { FC } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useRecoilState } from 'recoil';
import { matchInProgress } from '@stores/recoil';
import { CarbonCaptureDetails, MatchSocketEvent } from '@toa-lib/models';
import { useSocket } from 'src/api/SocketProvider';
import CarbonLevelInput from './CarbonLevelInput';
import MatchChip from '@components/MatchChip/MatchChip';
import ConnectionChip from '@components/ConnectionChip/ConnectionChip';

const ScoreSheet: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket] = useSocket();

  const updateScore = (newScore: number) => {
    if (match && match.details) {
      const newMatch = {
        ...match,
        details: { ...match.details, carbonPoints: newScore }
      };
      socket?.emit(MatchSocketEvent.UPDATE, newMatch);
      setMatch(newMatch);
    }
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
