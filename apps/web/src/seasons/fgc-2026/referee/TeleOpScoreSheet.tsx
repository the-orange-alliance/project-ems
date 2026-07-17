import { FC } from 'react';
import { Row, Col, Typography } from 'antd';
import {
  Alliance,
  IgnitingInnovation,
  Match,
  MatchParticipant
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';

import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';
import { matchAtom } from 'src/stores/state/event.js';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onMatchDetailsAdjustment: <K extends keyof IgnitingInnovation.MatchDetails>(
    detailsKey: K,
    adjustment: number
  ) => void;
  onMatchDetailsUpdate: <K extends keyof IgnitingInnovation.MatchDetails>(
    detailsKey: K,
    value: IgnitingInnovation.MatchDetails[K]
  ) => void;
}

const braceStates = [
  IgnitingInnovation.BraceState.None,
  IgnitingInnovation.BraceState.Contact,
  IgnitingInnovation.BraceState.Zone1,
  IgnitingInnovation.BraceState.Zone2,
  IgnitingInnovation.BraceState.Zone3
];
const braceStateLabels = ['None', 'Contact', 'Zone 1', 'Zone 2', 'Zone 3'];

const TeleScoreSheet: FC<Props> = ({
  alliance,
  participants,
  onMatchDetailsAdjustment,
  onMatchDetailsUpdate
}) => {
  const match: Match<IgnitingInnovation.MatchDetails> | null =
    useAtomValue(matchAtom);
  const { data: teams } = useTeamsForEvent(match?.eventKey ?? '');
  const identifiers = useTeamIdentifiers();

  if (!match || !match.details) return null;
  const details = match.details;

  const handleSuppressionUnitChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      onMatchDetailsUpdate(
        alliance === 'blue'
          ? 'wildfireInBlueSuppressionUnit'
          : 'wildfireInRedSuppressionUnit',
        newValue
      );
    }
  };

  const handleSuppressionUnitIncrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'wildfireInBlueSuppressionUnit'
        : 'wildfireInRedSuppressionUnit',
      1
    );
  };

  const handleSuppressionUnitDecrement = () => {
    onMatchDetailsAdjustment(
      alliance === 'blue'
        ? 'wildfireInBlueSuppressionUnit'
        : 'wildfireInRedSuppressionUnit',
      -1
    );
  };

  const getBraceState = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return details.redRobotOneBraceState;
      case 12:
        return details.redRobotTwoBraceState;
      case 13:
        return details.redRobotThreeBraceState;
      case 21:
        return details.blueRobotOneBraceState;
      case 22:
        return details.blueRobotTwoBraceState;
      case 23:
        return details.blueRobotThreeBraceState;
      default:
        return 0;
    }
  };

  const updateBraceState = (station: number, value: number) => {
    switch (station) {
      case 11:
        onMatchDetailsUpdate('redRobotOneBraceState', value);
        break;
      case 12:
        onMatchDetailsUpdate('redRobotTwoBraceState', value);
        break;
      case 13:
        onMatchDetailsUpdate('redRobotThreeBraceState', value);
        break;
      case 21:
        onMatchDetailsUpdate('blueRobotOneBraceState', value);
        break;
      case 22:
        onMatchDetailsUpdate('blueRobotTwoBraceState', value);
        break;
      case 23:
        onMatchDetailsUpdate('blueRobotThreeBraceState', value);
        break;
    }
  };

  const getPartnerClimb = (station: number): boolean => {
    switch (station) {
      case 11:
        return details.redRobotOnePartnerClimb;
      case 12:
        return details.redRobotTwoPartnerClimb;
      case 13:
        return details.redRobotThreePartnerClimb;
      case 21:
        return details.blueRobotOnePartnerClimb;
      case 22:
        return details.blueRobotTwoPartnerClimb;
      case 23:
        return details.blueRobotThreePartnerClimb;
      default:
        return false;
    }
  };

  const updatePartnerClimb = (station: number, value: boolean) => {
    switch (station) {
      case 11:
        onMatchDetailsUpdate('redRobotOnePartnerClimb', value);
        break;
      case 12:
        onMatchDetailsUpdate('redRobotTwoPartnerClimb', value);
        break;
      case 13:
        onMatchDetailsUpdate('redRobotThreePartnerClimb', value);
        break;
      case 21:
        onMatchDetailsUpdate('blueRobotOnePartnerClimb', value);
        break;
      case 22:
        onMatchDetailsUpdate('blueRobotTwoPartnerClimb', value);
        break;
      case 23:
        onMatchDetailsUpdate('blueRobotThreePartnerClimb', value);
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
          {alliance === 'red' ? 'Red' : 'Blue'} SUPPRESSION UNIT
        </Typography.Title>
        <NumberInput
          value={
            alliance === 'red'
              ? details.wildfireInRedSuppressionUnit
              : details.wildfireInBlueSuppressionUnit
          }
          textFieldDisabled
          onChange={handleSuppressionUnitChange}
          onIncrement={handleSuppressionUnitIncrement}
          onDecrement={handleSuppressionUnitDecrement}
        />
      </Col>
      {participants?.map((p) => {
        if (p.station < 0) return null;
        const team = teams?.find((t) => t.teamKey === p.teamKey);
        const updateState = (value: number) => {
          updateBraceState(p.station, value);
        };
        const updateClimb = (value: boolean) => {
          updatePartnerClimb(p.station, value);
        };
        return (
          <Col key={`${p.teamKey}-Brace`} xs={24} sm={8}>
            <StateToggle
              title={
                <span>
                  {team && (
                    <span
                      className={`flag-icon flag-icon-${team.countryCode}`}
                    />
                  )}
                  &nbsp;{identifiers[p.teamKey]}&nbsp;BRACE
                </span>
              }
              states={braceStates}
              stateLabels={braceStateLabels}
              value={getBraceState(p.station) ?? 0}
              onChange={updateState}
              fullWidth
            />
            <StateToggle
              title={<span>{identifiers[p.teamKey]}&nbsp;PARTNER CLIMB</span>}
              states={[false, true]}
              stateLabels={['No', 'Yes']}
              value={getPartnerClimb(p.station)}
              onChange={updateClimb}
              fullWidth
            />
          </Col>
        );
      })}
    </Row>
  );
};

export default TeleScoreSheet;
