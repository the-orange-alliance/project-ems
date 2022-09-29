import { FC, useState, MouseEvent, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  matchInProgress,
  matchInProgressParticipantByKey
} from 'src/stores/Recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MatchParticipant } from '@toa-lib/models';
import NumberInput from '../../NumberInput';
import { useSocket } from 'src/api/SocketProvider';

const TeamSection: FC<{ participantKey: string }> = ({ participantKey }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantByKey(participantKey)
  );
  const match = useRecoilValue(matchInProgress);
  const [updateReady, setUpdateReady] = useState(false);
  const [socket] = useSocket();
  const [storageLevel, setStorageLevel] = useState(0);

  useEffect(() => {
    if (updateReady) {
      setUpdateReady(false);
      socket?.emit('match:update', match);
    }
  }, [updateReady]);

  const handleStorageLevel = (
    event: MouseEvent<HTMLElement>,
    newStorageLevel: number
  ) => {
    if (newStorageLevel !== null) {
      setStorageLevel(newStorageLevel);
    }
  };

  const handleCardChange = (newValue: number) => {
    if (participant) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.cardStatus = newValue;
      setParticipant(newParticipant);
      setUpdateReady(true);
    }
  };

  const handleYellowCard = () => {
    if (participant?.cardStatus == 1) {
      handleCardChange(0);
    } else {
      handleCardChange(1);
    }
  };

  const handleRedCard = () => {
    if (participant?.cardStatus == 2) {
      handleCardChange(0);
    } else {
      handleCardChange(2);
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center'
      }}
    >
      <Typography variant='h6'>
        {participant?.team?.teamNameLong} ({participant?.team?.country})
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          width: '100%'
        }}
      >
        <ToggleButtonGroup
          fullWidth
          color='primary'
          value={storageLevel}
          onChange={handleStorageLevel}
          exclusive
        >
          <ToggleButton value={0}>0</ToggleButton>
          <ToggleButton value={1}>1 PL</ToggleButton>
          <ToggleButton value={2}>2 LO</ToggleButton>
          <ToggleButton value={3}>3 MD</ToggleButton>
          <ToggleButton value={4}>4 HI</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          width: '100%',
          height: '2em'
        }}
      >
        <ToggleButton
          fullWidth
          value='yellowCard'
          selected={participant?.cardStatus == 1}
          onChange={handleYellowCard}
          color='warning'
        >
          Yellow Card
        </ToggleButton>
        <ToggleButton
          fullWidth
          value='redCard'
          selected={participant?.cardStatus == 2}
          onChange={handleRedCard}
          color='error'
        >
          Red Card
        </ToggleButton>
      </Box>
    </Box>
  );
};

const RefereeSheet: FC<{ alliance: MatchParticipant[] }> = ({ alliance }) => {
  return (
    <Paper
      sx={{
        padding: (theme) => theme.spacing(2),
        borderStyle: 'solid',
        borderWidth: 'thick',
        borderColor: alliance?.some((p) => p.station < 20)
          ? '#de1f1f'
          : '#1f85de',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography variant='h5' sx={{ textAlign: 'center' }}>
          {alliance?.some((p) => p.station < 20) ? 'Red' : 'Blue'} Alliance
        </Typography>
        {alliance?.map((p) => (
          <TeamSection
            key={p.matchParticipantKey}
            participantKey={p.matchParticipantKey}
          />
        ))}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
            alignItems: 'center'
          }}
        >
          <Typography variant='h6'>Fouls</Typography>
          <NumberInput value={0} />
        </Box>
      </Box>
    </Paper>
  );
};

export default RefereeSheet;
