import { FC } from 'react';
import Grid from '@mui/material/Grid';
import { MatchParticipant, Team } from '@toa-lib/models';
import TeamCardStatus from 'src/apps/Scoring/components/Status/TeamCardStatus';
import ParticipantDropdown from 'src/components/Dropdowns/ParticipantDropdown';

interface Props {
  p: MatchParticipant;
  onUpdate: (p: MatchParticipant) => void;
}

const EditableParticipant: FC<Props> = ({ p, onUpdate }) => {
  const onCardChange = (cardStatus: number) => {
    onUpdate({ ...p, cardStatus });
  };

  const onParticipantChange = (team: Team | null) => {
    if (team) {
      onUpdate({ ...p, teamKey: team.teamKey });
    }
  };

  return (
    <>
      <Grid item xs={12} sm={6} md={6}>
        <ParticipantDropdown
          teamKey={p.teamKey}
          onChange={onParticipantChange}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6} className='center'>
        <TeamCardStatus cardStatus={p.cardStatus} onChange={onCardChange} />
      </Grid>
    </>
  );
};

export default EditableParticipant;
