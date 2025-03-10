import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  ChargedUpDetails,
  Match,
  MatchParticipant
} from '@toa-lib/models';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';
import { NumberInput } from 'src/components/inputs/number-input';
import { StateToggle } from 'src/components/inputs/state-toggle';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onUpdate?: (match: Match<ChargedUpDetails>) => void;
}

const AutoScoreSheet: FC<Props> = ({ alliance, participants, onUpdate }) => {
  const [match, setMatch]: [
    Match<ChargedUpDetails> | null,
    SetterOrUpdater<Match<ChargedUpDetails> | null>
  ] = useRecoilState(matchOccurringAtom);

  if (!match || !match.details) return null;

  const setDetails = (
    key: keyof ChargedUpDetails,
    value: number
  ): Match<ChargedUpDetails> => {
    if (!match || !match.details) return match;
    const details = Object.assign({}, { ...match.details, [key]: value });
    const newMatch = Object.assign({}, { ...match, details });
    onUpdate?.(newMatch);
    return newMatch;
  };

  const getMobility = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redAutoMobilityOne;
      case 12:
        return match.details?.redAutoMobilityTwo;
      case 13:
        return match.details?.redAutoMobilityThree;
      case 21:
        return match.details?.blueAutoMobilityOne;
      case 22:
        return match.details?.blueAutoMobilityTwo;
      case 23:
        return match.details?.blueAutoMobilityThree;
      default:
        return 0;
    }
  };

  const updateMobility = (station: number, value: number) => {
    switch (station) {
      case 11:
        setMatch(setDetails('redAutoMobilityOne', value));
        break;
      case 12:
        setMatch(setDetails('redAutoMobilityTwo', value));
        break;
      case 13:
        setMatch(setDetails('redAutoMobilityThree', value));
        break;
      case 21:
        setMatch(setDetails('blueAutoMobilityOne', value));
        break;
      case 22:
        setMatch(setDetails('blueAutoMobilityTwo', value));
        break;
      case 23:
        setMatch(setDetails('blueAutoMobilityThree', value));
        break;
    }
  };

  const handleTopPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAutoTopPieces' : 'blueAutoTopPieces',
        newValue
      )
    );
  };

  const handleMidPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAutoMidPieces' : 'blueAutoMidPieces',
        newValue
      )
    );
  };

  const handleLowPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAutoLowPieces' : 'blueAutoLowPieces',
        newValue
      )
    );
  };

  const getChargeStatus = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redAutoChargeOne;
      case 12:
        return match.details?.redAutoChargeTwo;
      case 13:
        return match.details?.redAutoChargeThree;
      case 21:
        return match.details?.blueAutoChargeOne;
      case 22:
        return match.details?.blueAutoChargeTwo;
      case 23:
        return match.details?.blueAutoChargeThree;
      default:
        return 0;
    }
  };

  const updateChargeStatus = (station: number, value: number) => {
    switch (station) {
      case 11:
        setMatch(setDetails('redAutoChargeOne', value));
        break;
      case 12:
        setMatch(setDetails('redAutoChargeTwo', value));
        break;
      case 13:
        setMatch(setDetails('redAutoChargeThree', value));
        break;
      case 21:
        setMatch(setDetails('blueAutoChargeOne', value));
        break;
      case 22:
        setMatch(setDetails('blueAutoChargeTwo', value));
        break;
      case 23:
        setMatch(setDetails('blueAutoChargeThree', value));
        break;
    }
  };

  return (
    <Grid container spacing={3}>
      {participants?.map((p) => {
        const update = (value: number) => {
          updateMobility(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-mobility`} xs={12} md={3} lg={3}>
            <StateToggle
              title={`${p.teamKey} Mobility`}
              states={['No Mobility', 'Mobility']}
              value={getMobility(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Grid>
        );
      })}
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Top Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redAutoTopPieces
              : match.details.blueAutoTopPieces
          }
          onChange={handleTopPieceChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Mid Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redAutoMidPieces
              : match.details.blueAutoMidPieces
          }
          onChange={handleMidPieceChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Low Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redAutoLowPieces
              : match.details.blueAutoLowPieces
          }
          onChange={handleLowPieceChange}
        />
      </Grid>
      {participants?.map((p) => {
        const update = (value: number) => {
          updateChargeStatus(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-mobility`} xs={12} md={3} lg={3}>
            <StateToggle
              title={`${p.teamKey} Charge Station`}
              states={['None', 'Docked', 'Engaged']}
              value={getChargeStatus(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default AutoScoreSheet;
