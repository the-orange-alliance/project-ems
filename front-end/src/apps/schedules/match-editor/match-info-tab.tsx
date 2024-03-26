import { Grid, TextField } from '@mui/material';
import {
  Match,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { FC } from 'react';

interface Props {
  match: Match<any>;
  onUpdate: (match: Match<any>) => void;
}

export const MatchInfoTab: FC<Props> = ({ match, onUpdate }) => {
  const handleUpdates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name, type } = e.target;
    const typedValue = type === 'number' ? parseInt(value) : value;
    const newMatch = { ...match, [name]: typedValue };
    const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    const [redScore, blueScore] = functions.calculateScore(newMatch);
    onUpdate({ ...newMatch, redScore, blueScore });
  };
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Tournament ID'
          value={match?.tournamentKey}
          disabled
          fullWidth
          name='matchKey'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Match ID'
          value={match?.id}
          disabled
          fullWidth
          name='matchDetailKey'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Match Name'
          value={match?.name}
          fullWidth
          name='name'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Fouls'
          value={match?.redMinPen}
          type='number'
          fullWidth
          name='redMinPen'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Fouls'
          value={match?.blueMinPen}
          type='number'
          fullWidth
          name='blueMinPen'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Score'
          value={match?.redScore}
          type='number'
          fullWidth
          name='redScore'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Score'
          value={match?.blueScore}
          type='number'
          fullWidth
          name='blueScore'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Tech Fouls'
          value={match?.redMajPen}
          type='number'
          fullWidth
          name='redMajPen'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Tech Fouls'
          value={match?.blueMajPen}
          type='number'
          fullWidth
          name='blueMajPen'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Field Number'
          value={match?.fieldNumber}
          type='number'
          fullWidth
          name='fieldNumber'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};
