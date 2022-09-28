import { FC, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TeamCardStatus from './TeamCardStatus';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  matchInProgress,
  matchInProgressParticipantByKey
} from 'src/stores/Recoil';
import { useSocket } from 'src/api/SocketProvider';

interface Props {
  participantKey: string;
}

const TeamStatusRow: FC<Props> = ({ participantKey }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantByKey(participantKey)
  );
  const match = useRecoilValue(matchInProgress);
  const [updateReady, setUpdateReady] = useState(false);
  const [socket] = useSocket();

  useEffect(() => {
    if (updateReady) {
      setUpdateReady(false);
      console.log('updating');
      socket?.emit('match:update', match);
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

  return (
    <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(1) }}>
      <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography>{participant?.team?.teamNameLong}</Typography>
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
