import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import { matchByMatchKey } from 'src/stores/Recoil';
import { replaceInArray } from 'src/stores/Util';
import EditableParticipant from 'src/features/components/EditableParticipant/EditableParticipant';
import { MatchParticipant } from '@toa-lib/models';

interface Props {
  matchKey: string;
}

const MatchParticipantInfo: FC<Props> = ({ matchKey }) => {
  const [match, setMatch] = useRecoilState(matchByMatchKey(matchKey));

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  const handleUpdate = (p: MatchParticipant) => {
    if (!match || !match.participants) return;
    const participants = replaceInArray(
      match.participants,
      'matchParticipantKey',
      p.matchParticipantKey,
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
        <EditableParticipant
          key={p.matchParticipantKey}
          p={p}
          onUpdate={handleUpdate}
        />
      ))}
      <Grid item xs={12} sm={12} md={12}>
        <Typography>Blue Alliance</Typography>
      </Grid>
      {blueAlliance?.map((p) => (
        <EditableParticipant
          key={p.matchParticipantKey}
          p={p}
          onUpdate={handleUpdate}
        />
      ))}
    </Grid>
  );
};

export default MatchParticipantInfo;
