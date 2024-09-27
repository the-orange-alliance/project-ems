import { Grid, Typography } from '@mui/material';
import { Match, MatchParticipant, Team } from '@toa-lib/models';
import { FC } from 'react';
import {
  FGCParticipantCardStatus,
  ParticipantCardStatus
} from 'src/apps/scorekeeper/match-header/participant-card-status';
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
        const changeCard = (status: number) => {
          handleUpdate(p.teamKey, { ...p, cardStatus: status });
        };
        return (
          <>
            <Grid key={p.station} item xs={12} sm={6}>
              <AutocompleteTeam
                teamKey={p.teamKey}
                teams={teams}
                onChange={changeTeam}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {match.eventKey.startsWith('FGC') && (
                <FGCParticipantCardStatus
                  cardStatus={p.cardStatus}
                  onChange={changeCard}
                />
              )}
              {!match.eventKey.startsWith('FGC') && (
                <ParticipantCardStatus
                  cardStatus={p.cardStatus}
                  onChange={changeCard}
                />
              )}
            </Grid>
          </>
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
        const changeCard = (status: number) => {
          handleUpdate(p.teamKey, { ...p, cardStatus: status });
        };
        return (
          <>
            <Grid key={p.station} item xs={12} sm={6}>
              <AutocompleteTeam
                teamKey={p.teamKey}
                teams={teams}
                onChange={changeTeam}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {match.eventKey.startsWith('FGC') && (
                <FGCParticipantCardStatus
                  cardStatus={p.cardStatus}
                  onChange={changeCard}
                />
              )}
              {!match.eventKey.startsWith('FGC') && (
                <ParticipantCardStatus
                  cardStatus={p.cardStatus}
                  onChange={changeCard}
                />
              )}
            </Grid>
          </>
        );
      })}
    </Grid>
  );
};
