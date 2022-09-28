import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TeamCardStatus from './TeamCardStatus';
import { useRecoilState } from 'recoil';
import { matchInProgressParticipantByKey } from 'src/stores/Recoil';

interface Props {
  participantKey: string;
}

const TeamStatusRow: FC<Props> = ({ participantKey }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantByKey(participantKey)
  );

  const handleChange = (newValue: number) => {
    if (participant) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.cardStatus = newValue;
      setParticipant(newParticipant);
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
