import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  FeedingTheFuture,
  Match,
  MatchParticipant
} from '@toa-lib/models';
import { useRecoilValue } from 'recoil';

import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import { matchOccurringAtom } from 'src/stores/recoil';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { NumberInput } from 'src/components/inputs/number-input';
import { StateToggle } from 'src/components/inputs/state-toggle';
import NexusScoresheet from '../nexus-sheets/nexus-scoresheet';
import { AllianceNexusGoalState } from '@toa-lib/models/build/seasons/FeedingTheFuture';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onMatchDetailsAdjustment: <K extends keyof FeedingTheFuture.MatchDetails>(
    detailsKey: K,
    adjustment: number
  ) => void;
  onMatchDetailsUpdate: <K extends keyof FeedingTheFuture.MatchDetails>(
    detailsKey: K,
    value: FeedingTheFuture.MatchDetails[K]
  ) => void;
}

const TeleScoreSheet: FC<Props> = ({
  alliance,
  participants,
  onMatchDetailsAdjustment,
  onMatchDetailsUpdate
}) => {
  const match: Match<FeedingTheFuture.MatchDetails> | null =
    useRecoilValue(matchOccurringAtom);
  const { data: teams } = useTeamsForEvent(match?.eventKey ?? '');
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details) return null;

  const handleResevoirChange = (newValue: number, manuallyTyped: boolean) => {
    // If the new value was not manually typed (meaning that the increment or
    // decrement button was pushed), we handle it separately, so that increments
    // and decrements don't get lost
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'red' ? 'redResevoirConserved' : 'blueResevoirConserved',
        newValue
      );
    }
  };

  const handleResevoirDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redResevoirConserved' : 'blueResevoirConserved',
      -1
    );
  };

  const handleResevoirIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redResevoirConserved' : 'blueResevoirConserved',
      1
    );
  };

  const handleFoodSecuredChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
        newValue
      );
    }
  };

  const handleFoodSecuredDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
      -1
    );
  };

  const handleFoodSecuredIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
      1
    );
  };

  const getBalanceStatus = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redRobotOneParked;
      case 12:
        return match.details?.redRobotTwoParked;
      case 13:
        return match.details?.redRobotThreeParked;
      case 21:
        return match.details?.blueRobotOneParked;
      case 22:
        return match.details?.blueRobotTwoParked;
      case 23:
        return match.details?.blueRobotThreeParked;
      default:
        return 0;
    }
  };

  const updateNexusState = (state: AllianceNexusGoalState) => {
    if (alliance === 'red') {
      onMatchDetailsUpdate('redNexusState', state);
    } else {
      onMatchDetailsUpdate('blueNexusState', state);
    }
  };

  const updateOpposingNexusState = (state: AllianceNexusGoalState) => {
    if (alliance === 'red') {
      onMatchDetailsUpdate('blueNexusState', state);
    } else {
      onMatchDetailsUpdate('redNexusState', state);
    }
  };

  const updateParking = (station: number, value: number) => {
    switch (station) {
      case 11:
        onMatchDetailsUpdate('redRobotOneParked', value);
        break;
      case 12:
        onMatchDetailsUpdate('redRobotTwoParked', value);
        break;
      case 13:
        onMatchDetailsUpdate('redRobotThreeParked', value);
        break;
      case 21:
        onMatchDetailsUpdate('blueRobotOneParked', value);
        break;
      case 22:
        onMatchDetailsUpdate('blueRobotTwoParked', value);
        break;
      case 23:
        onMatchDetailsUpdate('blueRobotThreeParked', value);
        break;
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={6}>
        <Typography
          variant='h6'
          textAlign='center'
          sx={{ textTransform: 'capitalize' }}
        >
          {alliance} Resevoir Scored
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redResevoirConserved
              : match.details.blueResevoirConserved
          }
          textFieldDisabled
          onChange={handleResevoirChange}
          onIncrement={handleResevoirIncrement}
          onDecrement={handleResevoirDecrement}
        />
      </Grid>
      <Grid item xs={12} md={6} lg={6}>
        <Typography
          variant='h6'
          textAlign='center'
          sx={{ textTransform: 'capitalize' }}
        >
          {alliance} Food Secured
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redFoodSecured
              : match.details.blueFoodSecured
          }
          textFieldDisabled
          onChange={handleFoodSecuredChange}
          onIncrement={handleFoodSecuredIncrement}
          onDecrement={handleFoodSecuredDecrement}
        />
      </Grid>
      <Grid item xs={12}>
        <NexusScoresheet
          state={
            alliance === 'red'
              ? match.details.redNexusState
              : match.details.blueNexusState
          }
          opposingState={
            alliance === 'red'
              ? match.details.blueNexusState
              : match.details.redNexusState
          }
          onChange={updateNexusState}
          onOpposingChange={updateOpposingNexusState}
          alliance={alliance}
          side={'far'}
        />
      </Grid>
      {participants?.map((p) => {
        const team = teams?.find((t) => t.teamKey === p.teamKey);
        const update = (value: number) => {
          updateParking(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-Balance`} xs={12} md={6} lg={6}>
            {/* The states attribute MUST match the order of the Balance enum */}
            <StateToggle
              title={
                <span>
                  {team && (
                    <span
                      className={`flag-icon flag-icon-${team.countryCode}`}
                    />
                  )}
                  {identifiers[p.teamKey]}&nbsp;Parked
                </span>
              }
              states={['Not Parked', 'Parked']}
              value={getBalanceStatus(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default TeleScoreSheet;
