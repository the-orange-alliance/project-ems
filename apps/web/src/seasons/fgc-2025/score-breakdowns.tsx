import { EcoEquilibrium } from '@toa-lib/models';
import { FC } from 'react';
import { ScoreBreakdownProps } from '../index.js';
import { Row, Col, Input, Typography, Divider } from 'antd';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';

export const RedScoreBreakdown: FC<
  ScoreBreakdownProps<EcoEquilibrium.MatchDetails>
> = ({ match, handleUpdates, disabled }) => {
  const identifiers = useTeamIdentifiers();
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];

  const doUpdate = (key: any, value: any) => {
    if (handleUpdates) {
      // @ts-expect-error
      handleUpdates(`red${key}`, value);
    }
  };

  return (
    <FGC25ScoreBreakdown
      alliance='Red'
      protectionMult={match?.details?.redProtectionMultiplier ?? 0}
      park1State={match?.details?.redRobotOneParking ?? 0}
      park1Label={identifiers[redAlliance[0]?.teamKey]}
      park2State={match?.details?.redRobotTwoParking ?? 0}
      park2Label={identifiers[redAlliance[1]?.teamKey]}
      park3State={match?.details?.redRobotThreeParking ?? 0}
      park3Label={identifiers[redAlliance[2]?.teamKey]}
      minFoul={match?.redMinPen ?? 0}
      majFoul={match?.redMajPen ?? 0}
      score={match?.redScore ?? 0}
      disabled={disabled}
      handleUpdates={doUpdate}
    />
  );
};

export const BlueScoreBreakdown: FC<
  ScoreBreakdownProps<EcoEquilibrium.MatchDetails>
> = ({ match, handleUpdates, disabled }) => {
  const identifiers = useTeamIdentifiers();
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  const doUpdate = (key: any, value: any) => {
    console.log(`blue${key}: ${value}`);
    if (handleUpdates) {
      // @ts-expect-error
      handleUpdates(`blue${key}`, value);
    }
  };

  return (
    <FGC25ScoreBreakdown
      alliance='Blue'
      protectionMult={match?.details?.blueProtectionMultiplier ?? 0}
      park1State={match?.details?.blueRobotOneParking ?? 0}
      park1Label={identifiers[blueAlliance[0]?.teamKey]}
      park2State={match?.details?.blueRobotTwoParking ?? 0}
      park2Label={identifiers[blueAlliance[1]?.teamKey]}
      park3State={match?.details?.blueRobotThreeParking ?? 0}
      park3Label={identifiers[blueAlliance[2]?.teamKey]}
      minFoul={match?.blueMinPen ?? 0}
      majFoul={match?.blueMajPen ?? 0}
      score={match?.blueScore ?? 0}
      disabled={disabled}
      handleUpdates={doUpdate}
    />
  );
};

interface Props {
  alliance: 'Red' | 'Blue';
  protectionMult: number;
  park1State: number;
  park1Label: string;
  park2State: number;
  park2Label: string;
  park3State: number;
  park3Label: string;
  minFoul: number;
  majFoul: number;
  score: number;
  disabled?: boolean;
  handleUpdates?: (key: any, value: any) => void;
}

const FGC25ScoreBreakdown: FC<Props> = (data) => {
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
      {/* RED ALLIANCE END STATUS */}
      <Col xs={24} sm={12} md={8}>
        <StateToggle
          title={<span>{data.park1Label} End</span>}
          states={[
            EcoEquilibrium.MatchEndRobotState.Level0,
            EcoEquilibrium.MatchEndRobotState.Level1,
            EcoEquilibrium.MatchEndRobotState.Level2,
            EcoEquilibrium.MatchEndRobotState.Level3,
            EcoEquilibrium.MatchEndRobotState.Level4
          ]}
          stateLabels={['L0', 'L1', 'L2', 'L3', 'L4']}
          value={data.park1State ?? 0}
          disabled={data.disabled}
          fullWidth
          {...onChangeProps('RobotOneParking', true)}
        />
      </Col>
      <Col xs={24} sm={12} md={8}>
        <StateToggle
          title={<span>{data.park2Label} End</span>}
          states={[
            EcoEquilibrium.MatchEndRobotState.Level0,
            EcoEquilibrium.MatchEndRobotState.Level1,
            EcoEquilibrium.MatchEndRobotState.Level2,
            EcoEquilibrium.MatchEndRobotState.Level3,
            EcoEquilibrium.MatchEndRobotState.Level4
          ]}
          stateLabels={['L0', 'L1', 'L2', 'L3', 'L4']}
          value={data.park2State ?? 0}
          disabled={data.disabled}
          fullWidth
          {...onChangeProps('RobotTwoParking', true)}
        />
      </Col>
      <Col xs={24} sm={12} md={8}>
        <StateToggle
          title={<span>{data.park3Label} End</span>}
          states={[
            EcoEquilibrium.MatchEndRobotState.Level0,
            EcoEquilibrium.MatchEndRobotState.Level1,
            EcoEquilibrium.MatchEndRobotState.Level2,
            EcoEquilibrium.MatchEndRobotState.Level3,
            EcoEquilibrium.MatchEndRobotState.Level4
          ]}
          stateLabels={['L0', 'L1', 'L2', 'L3', 'L4']}
          value={data.park3State ?? 0}
          disabled={data.disabled}
          fullWidth
          {...onChangeProps('RobotThreeParking', true)}
        />
      </Col>

      <Col xs={24}>
        <Typography.Text>
          {data.alliance} Protection Multiplier (Calculated)
        </Typography.Text>
        <Input
          value={data.protectionMult ?? 0}
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
  ScoreBreakdownProps<EcoEquilibrium.MatchDetails>
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
        <Col xs={8}>
          <Typography.Text>Approx. Red Side Ecosystem</Typography.Text>
          <Input
            value={match?.details?.approximateBiodiversityRedSideEcosystem ?? 0}
            type='number'
            disabled
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={8}>
          <Typography.Text>Approx. Center Ecosystem</Typography.Text>
          <Input
            value={match?.details?.approximateBiodiversityCenterEcosystem ?? 0}
            type='number'
            disabled
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={8}>
          <Typography.Text>Approx. Blue Side Ecosystem</Typography.Text>
          <Input
            value={match?.details?.approximateBiodiversityCenterEcosystem ?? 0}
            type='number'
            disabled
            style={{ width: '100%' }}
          />
        </Col>

        <Col xs={8}>
          <Typography.Text>Exact Red Side Ecosystem</Typography.Text>
          <Input
            value={match?.details?.biodiversityUnitsRedSideEcosystem ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('biodiversityUnitsRedSideEcosystem')}
          />
        </Col>
        <Col xs={8}>
          <Typography.Text>Exact Center Ecosystem</Typography.Text>
          <Input
            value={match?.details?.biodiversityUnitsCenterEcosystem ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('biodiversityUnitsCenterEcosystem')}
          />
        </Col>
        <Col xs={8}>
          <Typography.Text>Exact Blue Side Ecosystem</Typography.Text>
          <Input
            value={match?.details?.biodiversityUnitsBlueSideEcosystem ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('biodiversityUnitsBlueSideEcosystem')}
          />
        </Col>

        <Col xs={12}>
          <Typography.Text>Blue Side Mitigator</Typography.Text>
          <Input
            value={match?.details?.barriersInBlueMitigator ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('barriersInBlueMitigator')}
          />
        </Col>
        <Col xs={12}>
          <Typography.Text>Red Side Mitigator</Typography.Text>
          <Input
            value={match?.details?.barriersInRedMitigator ?? 0}
            type='number'
            disabled={disabled}
            style={{ width: '100%' }}
            {...onChangeProps('barriersInRedMitigator')}
          />
        </Col>

        <Col xs={12}>
          <Typography.Text>
            Ecosystem Distribution Factor (Calculated)
          </Typography.Text>
          <StateToggle
            states={[
              EcoEquilibrium.DistributionFactor.NotEven,
              EcoEquilibrium.DistributionFactor.SomewhatEven,
              EcoEquilibrium.DistributionFactor.Even
            ]}
            stateLabels={[
              'Not Even (x0.5)',
              'Somewhat Even (x0.6)',
              'Even (x1.0)'
            ]}
            value={
              match?.details?.biodiversityDistributionFactor ??
              EcoEquilibrium.DistributionFactor.NotEven
            }
            disabled
            fullWidth
            title={undefined}
          />
        </Col>
        <Col xs={12}>
          <Typography.Text>Coopertition (Calculated)</Typography.Text>
          <StateToggle
            states={[
              EcoEquilibrium.CoopertitionBonus.None,
              EcoEquilibrium.CoopertitionBonus.Partial,
              EcoEquilibrium.CoopertitionBonus.Full
            ]}
            stateLabels={['None (+0)', 'Partial (+15)', 'Full (+30)']}
            value={
              match?.details?.coopertition ??
              EcoEquilibrium.CoopertitionBonus.None
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
