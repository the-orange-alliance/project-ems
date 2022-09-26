import { FC, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import NumberInput from '../../NumberInput';
import { useRecoilState, useRecoilValue } from 'recoil';
import { matchInProgressAtom, selectedMatchKeyAtom } from 'src/stores/Recoil';
import { CarbonCaptureDetails, Match } from '@toa-lib/models';
import { useSocket } from 'src/api/SocketProvider';

const Scoresheet: FC = () => {
  const matchKey = useRecoilValue(selectedMatchKeyAtom);
  const [match, setMatch] = useRecoilState(matchInProgressAtom(matchKey || ''));
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:update', onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:update', onUpdate);
    };
  }, []);

  useEffect(() => {
    console.log('NEW MATCH KEY');
  }, [matchKey]);

  const onUpdate = (newMatch: Match) => {
    console.log(matchKey, match);
    setMatch(newMatch);
  };

  const updateScore = (newScore: number) => {
    if (match && match.details) {
      socket?.emit('match:update', {
        ...match,
        details: { ...match.details, carbonPoints: newScore }
      });
    }
  };

  console.log(
    'carbon points',
    (match?.details as CarbonCaptureDetails)?.carbonPoints
  );

  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2) }}>
      <Box>
        <NumberInput
          value={(match?.details as CarbonCaptureDetails)?.carbonPoints || 0}
          onChange={updateScore}
        />
      </Box>
    </Paper>
  );
};

export default Scoresheet;
