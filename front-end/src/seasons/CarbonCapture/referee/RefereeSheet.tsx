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
  matchInProgressParticipantByKey,
  matchStateAtom
} from '@stores/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  CarbonCaptureDetails,
  MatchParticipant,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import NumberInput from '@components/Referee/NumberInput';
import { useSocket } from 'src/api/SocketProvider';
import MatchChip from '@components/MatchChip/MatchChip';
import ConnectionChip from '@components/ConnectionChip/ConnectionChip';

const TeamSection: FC<{ participantKey: string }> = ({ participantKey }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantByKey(participantKey)
  );
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [updateReady, setUpdateReady] = useState(false);
  const [socket] = useSocket();

  useEffect(() => {
    if (updateReady) {
      setUpdateReady(false);
      socket?.emit(MatchSocketEvent.UPDATE, match);
    }
  }, [updateReady]);

  const handleStorageLevel = (
    event: MouseEvent<HTMLElement>,
    newStorageLevel: number
  ) => {
    if (newStorageLevel !== null) {
      const newMatch = Object.assign({}, match);
      const details = match?.details as CarbonCaptureDetails;
      switch (participant?.station) {
        case 11:
          newMatch.details = {
            ...details,
            redRobotOneStorage: newStorageLevel || 0
          };
          break;
        case 12:
          newMatch.details = {
            ...details,
            redRobotTwoStorage: newStorageLevel || 0
          };
          break;
        case 13:
          newMatch.details = {
            ...details,
            redRobotThreeStorage: newStorageLevel || 0
          };
          break;
        case 21:
          newMatch.details = {
            ...details,
            blueRobotOneStorage: newStorageLevel || 0
          };
          break;
        case 22:
          newMatch.details = {
            ...details,
            blueRobotTwoStorage: newStorageLevel || 0
          };
          break;
        case 23:
          newMatch.details = {
            ...details,
            blueRobotThreeStorage: newStorageLevel || 0
          };
          break;
        default:
      }
      setMatch(newMatch);
      setUpdateReady(true);
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
  };

  const getStorageLevel = () => {
    const details = match?.details as CarbonCaptureDetails;
    switch (participant?.station) {
      case 11:
        return details.redRobotOneStorage;
      case 12:
        return details.redRobotTwoStorage;
      case 13:
        return details.redRobotThreeStorage;
      case 21:
        return details.blueRobotOneStorage;
      case 22:
        return details.blueRobotTwoStorage;
      case 23:
        return details.blueRobotThreeStorage;
    }
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
      <Typography variant='h6'>
        <span
          className={`flag-icon flag-icon-${participant?.team?.countryCode.toLowerCase()}`}
        />
        &nbsp;{participant?.team?.city}
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
          value={getStorageLevel()}
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

const Fouls: FC<{ alliance: MatchParticipant[]; disabled?: boolean }> = ({
  alliance,
  disabled
}) => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [updateReady, setUpdateReady] = useState(false);
  const [socket] = useSocket();

  useEffect(() => {
    if (updateReady) {
      setUpdateReady(false);
      socket?.emit(MatchSocketEvent.UPDATE, match);
    }
  }, [updateReady]);

  const handleFoulChange = (newFoulCount: number) => {
    if (match) {
      const newMatch = Object.assign({}, match);
      if (alliance?.some((p) => p.station < 20)) {
        newMatch.redMinPen = newFoulCount;
      } else {
        newMatch.blueMinPen = newFoulCount;
      }
      setMatch(newMatch);
      setUpdateReady(true);
    }
  };

  return (
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
      <NumberInput
        value={
          (alliance?.some((p) => p.station < 20)
            ? match?.redMinPen
            : match?.blueMinPen) || 0
        }
        onChange={handleFoulChange}
        disabled={disabled}
      />
    </Box>
  );
};

const RefereeSheet: FC<{ alliance: MatchParticipant[]; headRef?: boolean }> = ({
  alliance
}) => {
  const match = useRecoilValue(matchInProgress);

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
        <Box className='center'>
          <ConnectionChip />
          <MatchChip match={match} />
        </Box>
        {alliance?.map((p) => (
          <TeamSection
            key={p.matchParticipantKey}
            participantKey={p.matchParticipantKey}
          />
        ))}
        <Fouls alliance={alliance} />
      </Box>
    </Paper>
  );
};

export default RefereeSheet;
