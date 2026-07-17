import { IgnitingInnovation } from '@toa-lib/models';
import { FC } from 'react';
import { ScoreBreakdownProps } from '../index.js';
import { Row, Col, Input, Typography, Divider } from 'antd';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';

export const RedScoreBreakdown: FC<
  ScoreBreakdownProps<IgnitingInnovation.MatchDetails>
> = ({ match, handleUpdates, disabled }) => {
  const identifiers = useTeamIdentifiers();
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];

  const doUpdate = (key: any, value: any) => {
    if (handleUpdates) {
      // @ts-expect-error this works, despite what TS says!
      handleUpdates(`red${key}`, value);
    }
  };

  return (
    <FGC26ScoreBreakdown
      alliance='Red'
      wildfireInSuppressionUnit={
        match?.details?.wildfireInRedSuppressionUnit ?? 0
      }
      climbMultiplier={match?.details?.redClimbMultiplier ?? 0}
      partnerClimbPoints={match?.details?.redPartnerClimbPoints ?? 0}
      robot1BraceState={match?.details?.redRobotOneBraceState ?? 0}
      robot1Label={identifiers[redAlliance[0]?.teamKey]}
      robot1PartnerClimb={match?.details?.redRobotOnePartnerClimb ?? false}
      robot2BraceState={match?.details?.redRobotTwoBraceState ?? 0}
      robot2Label={identifiers[redAlliance[1]?.teamKey]}
      robot2PartnerClimb={match?.details?.redRobotTwoPartnerClimb ?? false}
      robot3BraceState={match?.details?.redRobotThreeBraceState ?? 0}
      robot3Label={identifiers[redAlliance[2]?.teamKey]}
      robot3PartnerClimb={match?.details?.redRobotThreePartnerClimb ?? false}
      minFoul={match?.redMinPen ?? 0}
      majFoul={match?.redMajPen ?? 0}
      score={match?.redScore ?? 0}
      disabled={disabled}
      handleUpdates={doUpdate}
    />
  );
};

export const BlueScoreBreakdown: FC<
  ScoreBreakdownProps<IgnitingInnovation.MatchDetails>
> = ({ match, handleUpdates, disabled }) => {
  const identifiers = useTeamIdentifiers();
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  const doUpdate = (key: any, value: any) => {
    if (handleUpdates) {
      // @ts-expect-error this works! despite what ts says
      handleUpdates(`blue${key}`, value);
    }
  };

  return (
    <FGC26ScoreBreakdown
      alliance='Blue'
      wildfireInSuppressionUnit={
        match?.details?.wildfireInBlueSuppressionUnit ?? 0
      }
      climbMultiplier={match?.details?.blueClimbMultiplier ?? 0}
      partnerClimbPoints={match?.details?.bluePartnerClimbPoints ?? 0}
      robot1BraceState={match?.details?.blueRobotOneBraceState ?? 0}
      robot1Label={identifiers[blueAlliance[0]?.teamKey]}
      robot1PartnerClimb={match?.details?.blueRobotOnePartnerClimb ?? false}
      robot2BraceState={match?.details?.blueRobotTwoBraceState ?? 0}
      robot2Label={identifiers[blueAlliance[1]?.teamKey]}
      robot2PartnerClimb={match?.details?.blueRobotTwoPartnerClimb ?? false}
      robot3BraceState={match?.details?.blueRobotThreeBraceState ?? 0}
      robot3Label={identifiers[blueAlliance[2]?.teamKey]}
      robot3PartnerClimb={match?.details?.blueRobotThreePartnerClimb ?? false}
      minFoul={match?.blueMinPen ?? 0}
      majFoul={match?.blueMajPen ?? 0}
      score={match?.blueScore ?? 0}
      disabled={disabled}
      handleUpdates={doUpdate}
    />
  );
};

const braceStates = [
  IgnitingInnovation.BraceState.None,
  IgnitingInnovation.BraceState.Contact,
  IgnitingInnovation.BraceState.Zone1,
  IgnitingInnovation.BraceState.Zone2,
  IgnitingInnovation.BraceState.Zone3
];
const braceStateLabels = ['None', 'Contact', 'Zone 1', 'Zone 2', 'Zone 3'];

interface Props {
  alliance: 'Red' | 'Blue';
  wildfireInSuppressionUnit: number;
  climbMultiplier: number;
  partnerClimbPoints: number;
  robot1BraceState: number;
  robot1Label: string;
  robot1PartnerClimb: boolean;
  robot2BraceState: number;
  robot2Label: string;
  robot2PartnerClimb: boolean;
  robot3BraceState: number;
  robot3Label: string;
  robot3PartnerClimb: boolean;
  minFoul: number;
  majFoul: number;
  score: number;
  disabled?: boolean;
  handleUpdates?: (key: any, value: any) => void;
}

const FGC26ScoreBreakdown: FC<Props> = (data) => {
  const { handleUpdates } = data;

  const onChangeProps = (key: any, noParse?: boolean) => {
    if (handleUpdates) {
      return {
        onChange: (e: any) => {
          const val = typeof e === 'object' && e.target ? e.target.value : e;
          handleUpdates(key, !noParse ? parseInt(val, 10) : val);
        }
      };
    }
  };

  const robots = [
    {
      key: 'RobotOne',
      braceState: data.robot1BraceState,
      label: data.robot1Label,
      partnerClimb: data.robot1PartnerClimb
    },
    {
      key: 'RobotTwo',
      braceState: data.robot2BraceState,
      label: data.robot2Label,
      partnerClimb: data.robot2PartnerClimb
    },
    {
      key: 'RobotThree',
      braceState: data.robot3BraceState,
      label: data.robot3Label,
      partnerClimb: data.robot3PartnerClimb
    }
  ];

  return (
    <Row
      gutter={[24, 24]}
      style={{
        border: `${data.alliance} solid 2px`,
        borderRadius: '10px',
        padding: 12,
        margin: 1
      }}
    >
      <Col xs={24}>
        <Typography.Text>
          {data.alliance} WILDFIRE in SUPPRESSION UNIT
        </Typography.Text>
        <Input
          value={data.wildfireInSuppressionUnit ?? 0}
          type='number'
          disabled={data.disabled}
          style={{ width: '100%' }}
          {...onChangeProps('WildfireInSuppressionUnit')}
        />
      </Col>

      {robots.map((robot) => (
        <Col xs={24} sm={12} md={8} key={robot.key}>
          <StateToggle
            title={<span>{robot.label} BRACE</span>}
            states={braceStates}
            stateLabels={braceStateLabels}
            value={robot.braceState ?? 0}
            disabled={data.disabled}
            fullWidth
            {...onChangeProps(`${robot.key}BraceState`, true)}
          />
          <StateToggle
            title={<span>{robot.label} PARTNER CLIMB</span>}
            states={[false, true]}
            stateLabels={['No', 'Yes']}
            value={robot.partnerClimb ?? false}
            disabled={data.disabled}
            fullWidth
            {...onChangeProps(`${robot.key}PartnerClimb`, true)}
          />
        </Col>
      ))}

      <Col xs={24} sm={12} md={8}>
        <Typography.Text>
          {data.alliance} Climb Multiplier (Calculated)
        </Typography.Text>
        <Input
          value={data.climbMultiplier ?? 0}
          type='number'
          disabled
          style={{ width: '100%' }}
        />
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Typography.Text>
          {data.alliance} Partner Climb Points (Calculated)
        </Typography.Text>
        <Input
          value={data.partnerClimbPoints ?? 0}
          type='number'
          disabled
          style={{ width: '100%' }}
        />
      </Col>

      <Col xs={24} sm={12} md={8}>
        <Typography.Text>{data.alliance} Minor Fouls</Typography.Text>
        <Input
          value={data.minFoul ?? 0}
          type='number'
          disabled={data.disabled}
          style={{ width: '100%' }}
          {...onChangeProps('MinPen')}
        />
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Typography.Text>{data.alliance} Major Fouls</Typography.Text>
        <Input
          value={data.majFoul ?? 0}
          type='number'
          disabled={data.disabled}
          style={{ width: '100%' }}
          {...onChangeProps('MajPen')}
        />
      </Col>
      <Col xs={24} sm={24} md={8}>
        <Typography.Text>{data.alliance} Score (Calculated)</Typography.Text>
        <Input
          value={data.score ?? 0}
          type='number'
          disabled
          style={{ width: '100%' }}
        />
      </Col>
    </Row>
  );
};

export const CombinedBreakdown: FC<
  ScoreBreakdownProps<IgnitingInnovation.MatchDetails>
> = ({ match, disabled, handleUpdates }) => {
  const onChangeProps = (key: any, noParse?: boolean) => {
    if (handleUpdates) {
      return {
        onChange: (e: any) => {
          const val = typeof e === 'object' && e.target ? e.target.value : e;
          handleUpdates(key, !noParse ? parseInt(val, 10) : val);
        }
      };
    }
  };

  return (
    <>
      <Divider>Global Alliance</Divider>
      <Row gutter={[24, 24]}>
        <Col xs={12}>
          <Typography.Text>WILDFIRE in EXTINGUISHER</Typography.Text>
          <Input
            value={match?.details?.wildfireInExtinguisher ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('wildfireInExtinguisher')}
          />
        </Col>
        <Col xs={12}>
          <Typography.Text>Coopertition Bonus (Calculated)</Typography.Text>
          <StateToggle
            states={[
              IgnitingInnovation.CoopertitionBonus.None,
              IgnitingInnovation.CoopertitionBonus.Four,
              IgnitingInnovation.CoopertitionBonus.Five,
              IgnitingInnovation.CoopertitionBonus.Six
            ]}
            stateLabels={['None (+0)', '4 Robots (+10)', '5 Robots (+25)', '6 Robots (+40)']}
            value={
              match?.details?.coopertition ??
              IgnitingInnovation.CoopertitionBonus.None
            }
            disabled
            fullWidth
            title={undefined}
          />
        </Col>
      </Row>
    </>
  );
};
