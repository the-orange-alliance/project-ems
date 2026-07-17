import {
  IgnitingInnovation,
  ItemUpdate,
  MatchSocketEvent,
  NumberAdjustment
} from '@toa-lib/models';
import { Row, Col, Typography, Card } from 'antd';
import { useAtom } from 'jotai';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { matchAtom } from 'src/stores/state/event.js';

const HeadRefereeExtra: React.FC = () => {
  const { worker } = useSocketWorker();
  const [match, setMatch] = useAtom(matchAtom);

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

  const handleMatchDetailsAdjustment = (
    detailsKey: keyof IgnitingInnovation.MatchDetails,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = {
      key: String(detailsKey),
      adjustment
    };
    worker?.emit(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      adjustmentPacket
    );

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        {
          ...match.details,
          [detailsKey]: (match.details[detailsKey] as number) + adjustment
        }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  const handleExtinguisherChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      handleMatchDetailsUpdate('wildfireInExtinguisher', newValue);
    }
  };

  const handleExtinguisherIncrement = () => {
    handleMatchDetailsAdjustment('wildfireInExtinguisher', 1);
  };

  const handleExtinguisherDecrement = () => {
    handleMatchDetailsAdjustment('wildfireInExtinguisher', -1);
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
          <Typography.Title
            level={5}
            style={{
              textAlign: 'center',
              textTransform: 'capitalize',
              marginBottom: 16
            }}
          >
            EXTINGUISHER (Global Alliance)
          </Typography.Title>
          <NumberInput
            value={match?.details?.wildfireInExtinguisher || 0}
            textFieldDisabled
            onChange={handleExtinguisherChange}
            onIncrement={handleExtinguisherIncrement}
            onDecrement={handleExtinguisherDecrement}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default HeadRefereeExtra;
