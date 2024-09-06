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

  const handleNexusChange = (newValue: number, manuallyTyped: boolean) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
        newValue
      );
    }
  };

  const handleNexusDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
      -1
    );
  };

  const handleNexusIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
      1
    );
  };

  const handleFoodSecuredChange = (newValue: number, manuallyTyped: boolean) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
        newValue
      );
    }
  };

  const handleFoodSecuredDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
      -1
    );
  };

  const handleFoodSecuredIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'red' ? 'redNexusConserved' : 'blueNexusConserved',
      1
    );
  };

  const getBalanceStatus = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redRobotOneBalanced;
      case 12:
        return match.details?.redRobotTwoBalanced;
      case 13:
        return match.details?.redRobotThreeBalanced;
      case 21:
        return match.details?.blueRobotOneBalanced;
      case 22:
        return match.details?.blueRobotTwoBalanced;
      case 23:
        return match.details?.blueRobotThreeBalanced;
      default:
        return 0;
    }
  };

  const updateBalance = (station: number, value: number) => {
    switch (station) {
      case 11:
        onMatchDetailsUpdate('redRobotOneBalanced', value);
        break;
      case 12:
        onMatchDetailsUpdate('redRobotTwoBalanced', value);
        break;
      case 13:
        onMatchDetailsUpdate('redRobotThreeBalanced', value);
        break;
      case 21:
        onMatchDetailsUpdate('blueRobotOneBalanced', value);
        break;
      case 22:
        onMatchDetailsUpdate('blueRobotTwoBalanced', value);
        break;
      case 23:
        onMatchDetailsUpdate('blueRobotThreeBalanced', value);
        break;
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={6}>
        <Typography variant='h6' textAlign='center'>
          Resevoir Scored
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
        <Typography variant='h6' textAlign='center'>
          Nexus Scored
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redNexusConserved
              : match.details.blueNexusConserved
          }
          textFieldDisabled
          onChange={handleNexusChange}
          onIncrement={handleNexusIncrement}
          onDecrement={handleNexusDecrement}
        />
      </Grid>
      <Grid item xs={12} md={6} lg={6}>
        <Typography variant='h6' textAlign='center'>
          Food Secured
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
      {participants?.map((p) => {
        const team = teams?.find((t) => t.teamKey === p.teamKey);
        const update = (value: number) => {
          updateBalance(p.station, value);
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
                  {identifiers[p.teamKey]}&nbsp;Balance
                </span>
              }
              states={['Unbalanced', 'Balanced']}
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
