import { Grid } from '@mui/material';
import { FC } from 'react';
import { AllianceCard } from './alliance-card';
import { useRecoilState } from 'recoil';
import { matchOccurringAtom } from 'src/stores/recoil';
import { MatchParticipant, Team } from '@toa-lib/models';
import { useMatchControl } from '../hooks/use-match-control';

interface Props {
  teams?: Team[];
}

export const MatchHeader: FC<Props> = ({ teams }) => {
  const { canPrestart, canResetField } = useMatchControl();
  const [match, setMatch] = useRecoilState(matchOccurringAtom);
  const canEdit = canPrestart || canResetField;
  const handleParticipantChange = (participants: MatchParticipant[]) => {
    if (!match) return;
    setMatch({ ...match, participants });
  };
  return (
    <Grid container spacing={3} sx={{ marginTop: (theme) => theme.spacing(2) }}>
      <Grid item xs={12} sm={6} md={6}>
        <AllianceCard
          teams={teams}
          participants={match?.participants}
          alliance='red'
          disabled={!canEdit}
          handleChange={handleParticipantChange}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <AllianceCard
          teams={teams}
          participants={match?.participants}
          alliance='blue'
          disabled={!canEdit}
          handleChange={handleParticipantChange}
        />
      </Grid>
    </Grid>
  );
};
