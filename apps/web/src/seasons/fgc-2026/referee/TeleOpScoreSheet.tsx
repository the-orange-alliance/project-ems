import { FC } from 'react';
import { Row, Col } from 'antd';
import {
  Alliance,
  FGC26FCS,
  IgnitingInnovation,
  Match,
  MatchParticipant,
  MatchState
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';

import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useFcsData } from 'src/api/use-fcs-data.js';
import { LedBallCalculator } from 'src/components/inputs/led-ball-calculator.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  /**
   * True inside the head referee overview. The EXTINGUISHER calculator is only shown
   * on the dedicated single-alliance tablets (where this is falsy) - the head referee
   * already has its own EXTINGUISHER control in HRExtra.
   */
  headReferee?: boolean;
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
  headReferee,
  onMatchDetailsAdjustment,
  onMatchDetailsUpdate
}) => {
  const match: Match<IgnitingInnovation.MatchDetails> | null =
    useAtomValue(matchAtom);
  const matchState = useAtomValue(matchStateAtom);
  const postMatch = matchState > MatchState.MATCH_IN_PROGRESS;
  const { data: teams } = useTeamsForEvent(match?.eventKey ?? '');
  const identifiers = useTeamIdentifiers();

  const { data: fcsData } = useFcsData<Partial<FGC26FCS.SettingsType>>(
    match?.fieldNumber ?? ''
  );
  const ratio =
    fcsData?.wildfireBallsPerLed ?? FGC26FCS.DEFAULT_SETTINGS.wildfireBallsPerLed;
  const extinguisherVisibility =
    fcsData?.extinguisherVisibility ??
    FGC26FCS.DEFAULT_SETTINGS.extinguisherVisibility;
  const showExtinguisherHere =
    !headReferee &&
    (extinguisherVisibility === 'both' || extinguisherVisibility === alliance);

  if (!match || !match.details) return null;
  const details = match.details;

  const ledKey =
    alliance === 'blue'
      ? 'approximateWildfireInBlueSuppressionUnit'
      : 'approximateWildfireInRedSuppressionUnit';
  const ballKey =
    alliance === 'blue'
      ? 'wildfireInBlueSuppressionUnit'
      : 'wildfireInRedSuppressionUnit';

  // "Conversion calculator": a ref may edit either the LED count or the ball count. Whichever
  // one they touch is authoritative and the other is fully recomputed from it - see
  // ledCountToBallCount/ballCountToLedCount.
  const handleLedChange = (newLedCount: number) => {
    onMatchDetailsUpdate(ledKey, newLedCount);
    onMatchDetailsUpdate(
      ballKey,
      IgnitingInnovation.ledCountToBallCount(newLedCount, ratio)
    );
  };

  const handleBallChange = (newBallCount: number) => {
    onMatchDetailsUpdate(ballKey, newBallCount);
    onMatchDetailsUpdate(
      ledKey,
      IgnitingInnovation.ballCountToLedCount(newBallCount, ratio)
    );
  };

  // EXTINGUISHER is a GLOBAL ALLIANCE goal - both alliances write the same detail keys.
  // Same conversion-calculator behaviour as the head referee's HRExtra sheet.
  const handleExtinguisherLedChange = (newLedCount: number) => {
    onMatchDetailsUpdate('approximateWildfireInExtinguisher', newLedCount);
    onMatchDetailsUpdate(
      'wildfireInExtinguisher',
      IgnitingInnovation.ledCountToBallCount(newLedCount, ratio)
    );
  };

  const handleExtinguisherBallChange = (newBallCount: number) => {
    onMatchDetailsUpdate('wildfireInExtinguisher', newBallCount);
    onMatchDetailsUpdate(
      'approximateWildfireInExtinguisher',
      IgnitingInnovation.ballCountToLedCount(newBallCount, ratio)
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
        <LedBallCalculator
          title={`${alliance === 'red' ? 'Red' : 'Blue'} SUPPRESSION UNIT`}
          ledCount={details[ledKey]}
          ballCount={details[ballKey]}
          ratio={ratio}
          onLedChange={handleLedChange}
          onBallChange={handleBallChange}
          ledDisabled={postMatch}
        />
      </Col>
      {showExtinguisherHere && (
        <Col
          xs={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <LedBallCalculator
            title='EXTINGUISHER (Global Alliance)'
            ledCount={details.approximateWildfireInExtinguisher}
            ballCount={details.wildfireInExtinguisher}
            ratio={ratio}
            onLedChange={handleExtinguisherLedChange}
            onBallChange={handleExtinguisherBallChange}
            ledDisabled={postMatch}
          />
        </Col>
      )}
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
