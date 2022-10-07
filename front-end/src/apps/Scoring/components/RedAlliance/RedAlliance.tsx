import { FC } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TeamStatusRow from '../Status/TeamStatusRow';
import { useRecoilValue } from 'recoil';
import { matchInProgress } from 'src/stores/Recoil';
import RedScoreBreakdown from '../ScoreBreakdown/RedScoreBreakdown';

const RedAlliance: FC = () => {
  const match = useRecoilValue(matchInProgress);

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  return (
    <Paper
      className='red-bg-imp'
      sx={{ paddingBottom: (theme) => theme.spacing(2) }}
    >
      <Grid container spacing={3}>
        <Grid item md={8}>
          {redAlliance?.map((p) => (
            <TeamStatusRow
              key={p.matchParticipantKey}
              participantKey={p.matchParticipantKey}
            />
          ))}
        </Grid>
        <Grid item md={4}>
          <RedScoreBreakdown />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RedAlliance;
