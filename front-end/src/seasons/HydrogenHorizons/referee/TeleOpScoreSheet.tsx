import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  HydrogenHorizons,
  Match,
  MatchParticipant
} from '@toa-lib/models';
import StateToggle from '@components/Referee/StateToggle';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchInProgressAtom } from '@stores/NewRecoil';
import NumberInput from '@components/Referee/NumberInput';
import {
  AlignmentStatus,
  Proficiency
} from '@toa-lib/models/build/seasons/HydrogenHorizons';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onUpdate?: (match: Match<HydrogenHorizons.MatchDetails>) => void;
}

const TeleScoreSheet: FC<Props> = ({ alliance, participants, onUpdate }) => {
  const [match, setMatch]: [
    Match<HydrogenHorizons.MatchDetails> | null,
    SetterOrUpdater<Match<HydrogenHorizons.MatchDetails> | null>
  ] = useRecoilState(matchInProgressAtom);

  if (!match || !match.details) return null;

  const setDetails = <K extends keyof HydrogenHorizons.MatchDetails>(
    key: K,
    value: HydrogenHorizons.MatchDetails[K]
  ): Match<HydrogenHorizons.MatchDetails> => {
    if (!match || !match.details) return match;
    const details = Object.assign({}, { ...match.details, [key]: value });
    const newMatch = Object.assign({}, { ...match, details });
    onUpdate?.(newMatch);
    return newMatch;
  };

  const handleOxygenChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redOxygenPoints' : 'blueOxygenPoints',
        newValue
      )
    );
  };

  const handleHydrogenChange = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redHydrogenPoints' : 'blueHydrogenPoints',
        newValue
      )
    );
  };

  const handleAlignmentUpdate = (newValue: AlignmentStatus) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redAlignment' : 'blueAlignment',
        newValue
      )
    );
  };

  const getProficiencyStatus = (station: number): Proficiency | undefined => {
    switch (station) {
      case 11:
        return match.details?.redOneProficiency;
      case 12:
        return match.details?.redTwoProficiency;
      case 13:
        return match.details?.redThreeProficiency;
      case 21:
        return match.details?.blueOneProficiency;
      case 22:
        return match.details?.blueTwoProficiency;
      case 23:
        return match.details?.blueThreeProficiency;
      default:
        return Proficiency.DEVELOPING;
    }
  };

  const updateProficiency = (station: number, value: Proficiency) => {
    switch (station) {
      case 11:
        setMatch(setDetails('redOneProficiency', value));
        break;
      case 12:
        setMatch(setDetails('redTwoProficiency', value));
        break;
      case 13:
        setMatch(setDetails('redThreeProficiency', value));
        break;
      case 21:
        setMatch(setDetails('blueOneProficiency', value));
        break;
      case 22:
        setMatch(setDetails('blueTwoProficiency', value));
        break;
      case 23:
        setMatch(setDetails('blueThreeProficiency', value));
        break;
    }
  };

  const handleCoopertition = (newValue: number) => {
    setMatch(setDetails('coopertitionBonus', newValue));
  };
  console.log({ match });
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Oxygen Points</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redOxygenPoints
              : match.details.blueOxygenPoints
          }
          onChange={handleOxygenChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6'>Hydrogen Points</Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redHydrogenPoints
              : match.details.blueHydrogenPoints
          }
          onChange={handleHydrogenChange}
        />
      </Grid>
      <Grid item xs={12} md={4} lg={4}>
        {/* The states attribute MUST match the order of the AlignmentStatus enum */}
        <StateToggle
          title={`Alignment`}
          states={['No Alignment', 'Partial Alignment', 'Full Alignment']}
          value={
            alliance === 'red'
              ? match.details.redAlignment
              : match.details.blueAlignment
          }
          onChange={handleAlignmentUpdate}
          fullWidth
        />
      </Grid>
      {participants?.map((p) => {
        const update = (value: Proficiency) => {
          updateProficiency(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-proficiency`} xs={12} md={3} lg={3}>
            {/* The states attribute MUST match the order of the Proficiency enum */}
            <StateToggle
              title={`${p.teamKey} Proficiency`}
              states={['Developing', 'Intermediate', 'Expert']}
              value={getProficiencyStatus(p.station) ?? Proficiency.DEVELOPING}
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
    </Grid>
  );
};

export default TeleScoreSheet;
