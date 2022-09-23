import { FC, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  matchStateAtom,
  selectedMatchSelector,
  timer
} from 'src/stores/Recoil';
import {
  removeMatchListeners,
  setupMatchListeners,
  useSocket
} from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { MatchState } from '@toa-lib/models';

const MatchStatus: FC = () => {
  const selectedMatch = useRecoilValue(selectedMatchSelector);
  const setState = useSetRecoilState(matchStateAtom);

  const [mode, setMode] = useState('NOT READY');

  const [socket, connected] = useSocket();

  const name = selectedMatch ? selectedMatch.matchName : 'No Match Selected';

  useEffect(() => {
    if (connected) {
      setupMatchListeners(
        onMatchAuto,
        onMatchTele,
        onMatchEndGame,
        onMatchEnd,
        onMatchAbort
      );
    }
  }, [connected, socket]);

  useEffect(() => {
    return () => {
      removeMatchListeners();
    };
  }, []);

  const onMatchAuto = () => setMode('AUTONOMOUS');
  const onMatchTele = () => setMode('TELEOPERATED');
  const onMatchEndGame = () => setMode('ENDGAME');
  const onMatchEnd = () => {
    setMode('MATCH END');
    setState(MatchState.MATCH_COMPLETE);
  };
  const onMatchAbort = () => {
    timer.abort();
    setMode('MATCH ABORTED');
  };

  return (
    <Paper sx={{ paddingBottom: (theme) => theme.spacing(2), height: '100%' }}>
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center'>{name}</Typography>
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
