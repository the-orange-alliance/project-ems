import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  ChargedUpDetails,
  Match,
  MatchParticipant
} from '@toa-lib/models';
import StateToggle from '../../StateToggle';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchInProgressAtom } from 'src/stores/NewRecoil';
import NumberInput from '../../NumberInput';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onUpdate?: (match: Match<ChargedUpDetails>) => void;
}

const TeleScoreSheet: FC<Props> = ({ alliance, participants, onUpdate }) => {
  const [match, setMatch]: [
    Match<ChargedUpDetails> | null,
    SetterOrUpdater<Match<ChargedUpDetails> | null>
  ] = useRecoilState(matchInProgressAtom);

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

  const handleTopPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redTeleTopPieces' : 'blueTeleTopPieces',
        newValue
      )
    );
  };

  const handleMidPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redTeleMidPieces' : 'blueTeleMidPieces',
        newValue
      )
    );
  };

  const handleLowPieceChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redTeleLowPieces' : 'blueTeleLowPieces',
        newValue
      )
    );
  };

  const getChargeStatus = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redTeleChargeOne;
      case 12:
        return match.details?.redTeleChargeTwo;
      case 13:
        return match.details?.redTeleChargeThree;
      case 21:
        return match.details?.blueTeleChargeOne;
      case 22:
        return match.details?.blueTeleChargeTwo;
      case 23:
        return match.details?.blueTeleChargeThree;
      default:
        return 0;
    }
  };

  const handleLinksChange = (newValue: number) => {
    setMatch(
      setDetails(alliance === 'red' ? 'redLinks' : 'blueLinks', newValue)
    );
  };

  const updateChargeStatus = (station: number, value: number) => {
    switch (station) {
      case 11:
        setMatch(setDetails('redTeleChargeOne', value));
        break;
      case 12:
        setMatch(setDetails('redTeleChargeTwo', value));
        break;
      case 13:
        setMatch(setDetails('redTeleChargeThree', value));
        break;
      case 21:
        setMatch(setDetails('blueTeleChargeOne', value));
        break;
      case 22:
        setMatch(setDetails('blueTeleChargeTwo', value));
        break;
      case 23:
        setMatch(setDetails('blueTeleChargeThree', value));
        break;
    }
  };

  const handleCoopertition = (newValue: number) => {
    setMatch(setDetails('coopertitionBonus', newValue));
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Top Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redTeleTopPieces
              : match.details.blueTeleTopPieces
          }
          onChange={handleTopPieceChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Mid Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redTeleMidPieces
              : match.details.blueTeleMidPieces
          }
          onChange={handleMidPieceChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Low Game Pieces</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redTeleLowPieces
              : match.details.blueTeleLowPieces
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
      <Grid item xs={12} md={3} lg={3}>
        <StateToggle
          title={`Coopertition Bonus`}
          states={['None', 'Cooperated']}
          value={match.details.coopertitionBonus}
          onChange={handleCoopertition}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>
          {alliance.toUpperCase()}&nbsp; Links
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redLinks
              : match.details.blueLinks
          }
          onChange={handleLinksChange}
        />
      </Grid>
    </Grid>
  );
};

export default TeleScoreSheet;
