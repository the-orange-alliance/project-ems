import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import { replaceInArray } from 'src/stores/Util';
import EditableParticipant from 'src/features/components/EditableParticipant/EditableParticipant';
import { MatchParticipant } from '@toa-lib/models';
import { matchByCurrentIdSelectorFam } from 'src/stores/NewRecoil';

interface Props {
  id: number;
}

const MatchParticipantInfo: FC<Props> = ({ id }) => {
  const [match, setMatch] = useRecoilState(matchByCurrentIdSelectorFam(id));

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  const handleUpdate = (p: MatchParticipant) => {
    if (!match || !match.participants) return;
    const participants = replaceInArray(
      match.participants,
      'station',
      p.station,
      p
    );
    setMatch({ ...match, participants });
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

export default MatchParticipantInfo;
