import {
  FGC26FCS,
  IgnitingInnovation,
  ItemUpdate,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import { Row, Col, Card } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useFcsData } from 'src/api/use-fcs-data.js';
import { LedBallCalculator } from 'src/components/inputs/led-ball-calculator.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';

const HeadRefereeExtra: React.FC = () => {
  const { worker } = useSocketWorker();
  const [match, setMatch] = useAtom(matchAtom);
  const matchState = useAtomValue(matchStateAtom);
  const postMatch = matchState > MatchState.MATCH_IN_PROGRESS;
  const { data: fcsData } = useFcsData<Partial<FGC26FCS.SettingsType>>(
    match?.fieldNumber ?? ''
  );
  const ratio =
    fcsData?.wildfireBallsPerLed ??
    FGC26FCS.DEFAULT_SETTINGS.wildfireBallsPerLed;

  const handleMatchDetailsUpdate = <
    K extends keyof IgnitingInnovation.MatchDetails
  >(
    detailsKey: K,
    value: IgnitingInnovation.MatchDetails[K]
  ) => {
    const updatePacket: ItemUpdate = { key: String(detailsKey), value };
    worker?.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, updatePacket);

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        { ...match.details, [detailsKey]: value }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  // "Conversion calculator": a ref may edit either the LED count or the ball count. Whichever
  // one they touch is authoritative and the other is fully recomputed from it - see
  // ledCountToBallCount/ballCountToLedCount.
  const handleLedChange = (newLedCount: number) => {
    handleMatchDetailsUpdate('approximateWildfireInExtinguisher', newLedCount);
    handleMatchDetailsUpdate(
      'wildfireInExtinguisher',
      IgnitingInnovation.ledCountToBallCount(newLedCount, ratio)
    );
  };

  const handleBallChange = (newBallCount: number) => {
    handleMatchDetailsUpdate('wildfireInExtinguisher', newBallCount);
    handleMatchDetailsUpdate(
      'approximateWildfireInExtinguisher',
      IgnitingInnovation.ballCountToLedCount(newBallCount, ratio)
    );
  };

  return (
    <Card
      style={{
        border: 'thick solid',
        borderColor: 'purple',
        width: '100%',
        padding: 16
      }}
      styles={{ body: { padding: 0 } }}
    >
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
            title='EXTINGUISHER (Global Alliance)'
            ledCount={match?.details?.approximateWildfireInExtinguisher ?? 0}
            ballCount={match?.details?.wildfireInExtinguisher ?? 0}
            ratio={ratio}
            onLedChange={handleLedChange}
            onBallChange={handleBallChange}
            ledDisabled={postMatch}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default HeadRefereeExtra;
