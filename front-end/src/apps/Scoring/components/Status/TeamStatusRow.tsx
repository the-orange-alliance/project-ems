import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TeamCardStatus from './TeamCardStatus';
import { MatchParticipant } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { teamByTeamKey } from 'src/stores/Recoil';

interface Props {
  participant: MatchParticipant;
}

const TeamStatusRow: FC<Props> = ({ participant }) => {
  const team = useRecoilValue(teamByTeamKey(participant.teamKey));

  return (
    <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(1) }}>
      <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography>{team?.teamNameLong}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TeamCardStatus />
      </Grid>
    </Grid>
  );
};

export default TeamStatusRow;
