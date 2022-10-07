import { FC } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useRecoilState } from 'recoil';
import { matchInProgress } from 'src/stores/Recoil';
import { CarbonCaptureDetails } from '@toa-lib/models';
import { useSocket } from 'src/api/SocketProvider';
import CarbonLevelInput from './CarbonLevelInput';

const ScoreSheet: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket] = useSocket();

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
        <CarbonLevelInput
          value={(match?.details as CarbonCaptureDetails)?.carbonPoints || 0}
          onChange={updateScore}
        />
      </Box>
    </Paper>
  );
};

export default ScoreSheet;
