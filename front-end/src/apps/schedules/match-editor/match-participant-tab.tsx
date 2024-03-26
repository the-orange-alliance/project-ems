import { Grid, Typography } from '@mui/material';
import { Match, MatchParticipant } from '@toa-lib/models';
import { FC } from 'react';
import EditableParticipant from 'src/components/dropdowns/EditableParticipant';
import { replaceInArray } from 'src/stores/Util';

interface Props {
  match: Match<any>;
  onUpdate: (match: Match<any>) => void;
}

export const MatchParticipantTab: FC<Props> = ({ match, onUpdate }) => {
  const redAlliance = match.participants?.filter((p) => p.station < 20);
  const blueAlliance = match.participants?.filter((p) => p.station >= 20);
  const handleUpdate = (p: MatchParticipant) => {
    if (!match || !match.participants) return;
    const participants = replaceInArray(
      match.participants,
      'station',
      p.station,
      p
    );
    onUpdate({ ...match, participants });
  };
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={12}>
        <Typography>Red Alliance</Typography>
      </Grid>
      {redAlliance?.map((p) => (
        <EditableParticipant key={p.station} p={p} onUpdate={handleUpdate} />
      ))}
      <Grid item xs={12} sm={12} md={12}>
        <Typography>Blue Alliance</Typography>
      </Grid>
      {blueAlliance?.map((p) => (
        <EditableParticipant key={p.station} p={p} onUpdate={handleUpdate} />
      ))}
    </Grid>
  );
};
