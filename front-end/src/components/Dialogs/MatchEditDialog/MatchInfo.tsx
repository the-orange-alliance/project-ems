import { FC, ChangeEvent } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import { useRecoilState } from 'recoil';
import { FormControlLabel } from '@mui/material';
import {
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  Match
} from '@toa-lib/models';
import { matchByCurrentIdSelectorFam } from 'src/stores/NewRecoil';

interface Props {
  id: number;
}

const MatchInfo: FC<Props> = ({ id }) => {
  const [match, setMatch] = useRecoilState(matchByCurrentIdSelectorFam(id));

  const handleUpdates = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, name, type } = e.target;
    if (!match) return;
    const typedValue = type === 'number' ? parseInt(value) : value;
    const newMatch = { ...match, [name]: typedValue };
    const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    const [redScore, blueScore] = functions.calculateScore(newMatch);
    if (match) {
      setMatch({ ...newMatch, redScore, blueScore });
    }
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
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={(match?.result ?? -1) > -1}
              onChange={(e) => {
                setMatch({
                  ...match,
                  result: e.target.checked ? 0 : -1
                } as Match<any>);
              }}
            />
          }
          label='Publish Results?'
        />
      </Grid>
    </Grid>
  );
};

export default MatchInfo;
