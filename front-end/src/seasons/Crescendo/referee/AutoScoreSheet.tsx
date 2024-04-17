import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Alliance, Crescendo, Match, MatchParticipant } from '@toa-lib/models';
import StateToggle from 'src/components/inputs/StateToggle';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';
import NumberInput from 'src/components/inputs/NumberInput';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onUpdate?: (match: Match<Crescendo.MatchDetails>) => void;
}

const AutoScoreSheet: FC<Props> = ({ alliance, participants, onUpdate }) => {
  const [match, setMatch]: [
    Match<Crescendo.MatchDetails> | null,
    SetterOrUpdater<Match<Crescendo.MatchDetails> | null>
  ] = useRecoilState(matchOccurringAtom);

  if (!match || !match.details) return null;

  const setDetails = (
    key: keyof Crescendo.MatchDetails,
    value: number
  ): Match<Crescendo.MatchDetails> => {
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

  const handleAmpChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAutoAmpNotes' : 'blueAutoAmpNotes',
        newValue
      )
    );
  };

  const handleSpeakerChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAutoSpeakerNotes' : 'blueAutoSpeakerNotes',
        newValue
      )
    );
  };

  return (
    <Grid container spacing={3} justifyContent={'space-around'}>
      {participants?.map((p) => {
        const update = (value: number) => {
          updateMobility(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-mobility`} xs={12} md={3} lg={3}>
            <StateToggle
              title={`${p.teamKey} Leave`}
              states={['None', 'LEAVE']}
              value={getMobility(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Grid>
        );
      })}
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6' sx={{ textAlign: 'center' }}>
          Amp Notes
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redAutoAmpNotes
              : match.details.blueAutoAmpNotes
          }
          onChange={handleAmpChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6' sx={{ textAlign: 'center' }}>
          Speaker Notes
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redAutoSpeakerNotes
              : match.details.blueAutoSpeakerNotes
          }
          onChange={handleSpeakerChange}
        />
      </Grid>
    </Grid>
  );
};

export default AutoScoreSheet;
