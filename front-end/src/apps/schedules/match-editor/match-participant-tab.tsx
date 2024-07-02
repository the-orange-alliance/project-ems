import { Grid, Typography } from '@mui/material';
import { Match, MatchParticipant, Team } from '@toa-lib/models';
import { FC } from 'react';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team';

import { replaceInArray } from 'src/stores/array-utils';

interface Props {
  match: Match<any>;
  teams?: Team[];
  onUpdate: (match: Match<any>) => void;
}

export const MatchParticipantTab: FC<Props> = ({ match, teams, onUpdate }) => {
  const redAlliance = match.participants?.filter((p) => p.station < 20);
  const blueAlliance = match.participants?.filter((p) => p.station >= 20);
  const handleUpdate = (teamKey: number, p: MatchParticipant) => {
    if (!match || !match.participants) return;
    const participants = replaceInArray(
      match.participants,
      'station',
      p.station,
      { ...p, teamKey }
    );
    onUpdate({ ...match, participants });
  };
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={12}>
        <Typography>Red Alliance</Typography>
      </Grid>
      {redAlliance?.map((p) => {
        const changeTeam = (t: Team | null) => {
          if (!t) return;
          handleUpdate(t.teamKey, p);
        };
        return (
          <AutocompleteTeam
            key={p.station}
            teamKey={p.teamKey}
            teams={teams}
            onChange={changeTeam}
          />
        );
      })}
      <Grid item xs={12} sm={12} md={12}>
        <Typography>Blue Alliance</Typography>
      </Grid>
      {blueAlliance?.map((p) => {
        const changeTeam = (t: Team | null) => {
          if (!t) return;
          handleUpdate(t.teamKey, p);
        };
        return (
          <AutocompleteTeam
            key={p.station}
            teamKey={p.teamKey}
            teams={teams}
            onChange={changeTeam}
          />
        );
      })}
    </Grid>
  );
};
