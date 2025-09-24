import { FC } from 'react';
import { Row, Col, Typography } from 'antd';
import {
  Alliance,
  EcoEquilibrium,
  Match,
  MatchParticipant,
  MatchState
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';

import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onMatchDetailsAdjustment: <K extends keyof EcoEquilibrium.MatchDetails>(
    detailsKey: K,
    adjustment: number
  ) => void;
  onMatchDetailsUpdate: <K extends keyof EcoEquilibrium.MatchDetails>(
    detailsKey: K,
    value: EcoEquilibrium.MatchDetails[K]
  ) => void;
}

const TeleScoreSheet: FC<Props> = ({
  alliance,
  participants,
  onMatchDetailsAdjustment,
  onMatchDetailsUpdate
}) => {
  const match: Match<EcoEquilibrium.MatchDetails> | null =
    useAtomValue(matchAtom);
  const { data: teams } = useTeamsForEvent(match?.eventKey ?? '');
  const identifiers = useTeamIdentifiers();
  const matchState = useAtomValue(matchStateAtom);
  const postMatch = matchState > MatchState.MATCH_IN_PROGRESS;
  if (!match || !match.details) return null;

  const handleMitigatorChange = (newValue: number, manuallyTyped: boolean) => {
    // If the new value was not manually typed (meaning that the increment or
    // decrement button was pushed), we handle it separately, so that increments
    // and decrements don't get lost
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        // purposely reversed
        alliance === 'blue'
          ? 'barriersInBlueMitigator'
          : 'barriersInRedMitigator',
        newValue
      );
    }
  };

  const handleMitigatorDecrement = () => {
    onMatchDetailsAdjustment(
      // intentionally reversed
      alliance === 'blue'
        ? 'barriersInBlueMitigator'
        : 'barriersInRedMitigator',
      -1
    );
  };

  const handleMitigatorIncrement = () => {
    onMatchDetailsAdjustment(
      // intentionally reversed
      alliance === 'blue'
        ? 'barriersInBlueMitigator'
        : 'barriersInRedMitigator',
      1
    );
  };

  const handleEcosystemApproxChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'blue'
          ? 'approximateBiodiversityBlueSideEcosystem'
          : 'approximateBiodiversityRedSideEcosystem',
        newValue
      );
    }
  };

  const handleEcosystemApproxIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'approximateBiodiversityBlueSideEcosystem'
        : 'approximateBiodiversityRedSideEcosystem',
      1
    );
  };

  const handleEcosystemApproxDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'approximateBiodiversityBlueSideEcosystem'
        : 'approximateBiodiversityRedSideEcosystem',
      -1
    );
  };

  const handleEcosystemExactChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'blue'
          ? 'biodiversityUnitsBlueSideEcosystem'
          : 'biodiversityUnitsRedSideEcosystem',
        newValue
      );
    }
  };

  const handleEcosystemExactIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'biodiversityUnitsBlueSideEcosystem'
        : 'biodiversityUnitsRedSideEcosystem',
      1
    );
  };

  const handleEcosystemExactDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'biodiversityUnitsBlueSideEcosystem'
        : 'biodiversityUnitsRedSideEcosystem',
      -1
    );
  };

  const getParking = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redRobotOneParking;
      case 12:
        return match.details?.redRobotTwoParking;
      case 13:
        return match.details?.redRobotThreeParking;
      case 21:
        return match.details?.blueRobotOneParking;
      case 22:
        return match.details?.blueRobotTwoParking;
      case 23:
        return match.details?.blueRobotThreeParking;
      default:
        return 0;
    }
  };

  const updateParking = (station: number, value: number) => {
    switch (station) {
      case 11:
        onMatchDetailsUpdate('redRobotOneParking', value);
        break;
      case 12:
        onMatchDetailsUpdate('redRobotTwoParking', value);
        break;
      case 13:
        onMatchDetailsUpdate('redRobotThreeParking', value);
        break;
      case 21:
        onMatchDetailsUpdate('blueRobotOneParking', value);
        break;
      case 22:
        onMatchDetailsUpdate('blueRobotTwoParking', value);
        break;
      case 23:
        onMatchDetailsUpdate('blueRobotThreeParking', value);
        break;
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col
        xs={24}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography.Title
          level={5}
          style={{
            textAlign: 'center',
            textTransform: 'capitalize',
            marginBottom: 16
          }}
        >
          {alliance === 'red' ? 'Red' : 'Blue'} Side Mitigator
        </Typography.Title>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.barriersInRedMitigator
              : match.details.barriersInBlueMitigator
          }
          textFieldDisabled
          onChange={handleMitigatorChange}
          onIncrement={handleMitigatorIncrement}
          onDecrement={handleMitigatorDecrement}
        />
      </Col>
      <Col
        xs={24}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography.Title
          level={5}
          style={{
            textAlign: 'center',
            textTransform: 'capitalize',
            marginBottom: 16
          }}
        >
          Approx. {alliance === 'red' ? 'Red' : 'Blue'} Side Ecosystem
        </Typography.Title>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.approximateBiodiversityRedSideEcosystem
              : match.details.approximateBiodiversityBlueSideEcosystem
          }
          textFieldDisabled
          onChange={handleEcosystemApproxChange}
          onIncrement={handleEcosystemApproxIncrement}
          onDecrement={handleEcosystemApproxDecrement}
          disabled={postMatch}
        />
      </Col>
      {postMatch && (
        <Col
          xs={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography.Title
            level={5}
            style={{
              textAlign: 'center',
              textTransform: 'capitalize',
              marginBottom: 16
            }}
          >
            Exact {alliance === 'red' ? 'Red' : 'Blue'} Side Ecosystem
          </Typography.Title>
          <NumberInput
            value={
              alliance === 'red'
                ? match.details.biodiversityUnitsRedSideEcosystem
                : match.details.biodiversityUnitsBlueSideEcosystem
            }
            onChange={handleEcosystemExactChange}
            onIncrement={handleEcosystemExactIncrement}
            onDecrement={handleEcosystemExactDecrement}
          />
        </Col>
      )}
      {participants?.map((p) => {
        const team = teams?.find((t) => t.teamKey === p.teamKey);
        const update = (value: number) => {
          updateParking(p.station, value);
        };
        return (
          <Col key={`${p.teamKey}-Balance`} xs={24} sm={8}>
            <StateToggle
              title={
                <span>
                  {team && (
                    <span
                      className={`flag-icon flag-icon-${team.countryCode}`}
                    />
                  )}
                  &nbsp;{identifiers[p.teamKey]}&nbsp;Parking
                </span>
              }
              states={[
                EcoEquilibrium.MatchEndRobotState.Level0,
                EcoEquilibrium.MatchEndRobotState.Level1,
                EcoEquilibrium.MatchEndRobotState.Level2,
                EcoEquilibrium.MatchEndRobotState.Level3,
                EcoEquilibrium.MatchEndRobotState.Level4
              ]}
              stateLabels={['L0', 'L1', 'L2', 'L3', 'L4']}
              value={getParking(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Col>
        );
      })}
    </Row>
  );
};

export default TeleScoreSheet;
