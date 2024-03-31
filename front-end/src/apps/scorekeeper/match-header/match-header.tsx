import { Grid } from '@mui/material';
import { FC } from 'react';
import { AllianceCard } from './alliance-card';
import { useRecoilState } from 'recoil';
import { matchOccurringAtom } from 'src/stores/recoil';
import { MatchParticipant } from '@toa-lib/models';

export const MatchHeader: FC = () => {
  const [match, setMatch] = useRecoilState(matchOccurringAtom);
  const handleParticipantChange = (participants: MatchParticipant[]) => {
    if (!match) return;
    setMatch({ ...match, participants });
  };
  return (
    <Grid container spacing={3} sx={{ marginTop: (theme) => theme.spacing(2) }}>
      <Grid item xs={12} sm={6} md={6}>
        <AllianceCard
          participants={match?.participants}
          alliance='red'
          handleChange={handleParticipantChange}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <AllianceCard
          participants={match?.participants}
          alliance='blue'
          handleChange={handleParticipantChange}
        />
      </Grid>
    </Grid>
  );
};
