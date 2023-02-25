import { FC, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { Match, MatchState } from '@toa-lib/models';
import { matchInProgressAtom, matchStateAtom } from 'src/stores/NewRecoil';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const MatchStatus: FC = () => {
  const selectedMatch = useRecoilValue(matchInProgressAtom);
  const setState = useSetRecoilState(matchStateAtom);

  const [mode, setMode] = useState('NOT READY');

  const [socket, connected] = useSocket();

  const name = selectedMatch ? selectedMatch.name : 'No Match Selected';

  useEffect(() => {
    if (connected) {
      socket?.on('match:auto', onMatchAuto);
      socket?.on('match:tele', onMatchTele);
      socket?.on('match:endgame', onMatchEndGame);
      socket?.on('match:end', onMatchEnd);
      socket?.on('match:update', onMatchUpdate);
    }
  }, [connected, socket]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:auto', onMatchAuto);
      socket?.removeListener('match:tele', onMatchTele);
      socket?.removeListener('match:endgame', onMatchEndGame);
      socket?.removeListener('match:end', onMatchEnd);
      socket?.removeListener('match:update', onMatchUpdate);
    };
  }, []);

  const onMatchAuto = () => setMode('AUTO');
  const onMatchTele = () => setMode('TELEOP');
  const onMatchEndGame = useRecoilCallback(() => async () => {
    setMode('ENDGAME');
  });
  const onMatchEnd = useRecoilCallback(() => async () => {
    setMode('MATCH END');
    setState(MatchState.MATCH_COMPLETE);
  });
  const onMatchUpdate = useRecoilCallback(
    ({ set }) =>
      async (match: Match<any>) => {
        set(matchInProgressAtom, match);
      }
  );

  return (
    <Paper sx={{ paddingBottom: (theme) => theme.spacing(2), height: '100%' }}>
      <Box
        sx={{
          padding: (theme) => theme.spacing(2),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <Typography align='center'>{name}</Typography>
        <Chip
          icon={connected ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          label={connected ? 'Connected' : 'Not Connected'}
          color={connected ? 'success' : 'error'}
        />
      </Box>
      <Divider />
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center' variant='h5'>
          {mode}
        </Typography>
        <Typography align='center' variant='h5'>
          <MatchCountdown />
        </Typography>
      </Box>
    </Paper>
  );
};

export default MatchStatus;
