import {
  EcoEquilibrium,
  ItemUpdate,
  MatchSocketEvent,
  NumberAdjustment
} from '@toa-lib/models';
import { Row, Col, Typography, Card } from 'antd';
import { useAtom } from 'jotai';
import { useSocket } from 'src/api/use-socket.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { matchAtom } from 'src/stores/state/event.js';
const HeadRefereeExtra: React.FC = () => {
  const [socket] = useSocket();
  const [match, setMatch] = useAtom(matchAtom);

  const handleMatchDetailsUpdate = <
    K extends keyof EcoEquilibrium.MatchDetails
  >(
    detailsKey: K,
    value: EcoEquilibrium.MatchDetails[K]
  ) => {
    const updatePacket: ItemUpdate = { key: String(detailsKey), value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, updatePacket);

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
    detailsKey: keyof EcoEquilibrium.MatchDetails,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = {
      key: String(detailsKey),
      adjustment
    };
    socket?.emit(
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

  const handleEcosystemChange = (newValue: number, manuallyTyped: boolean) => {
    if (manuallyTyped) {
      handleMatchDetailsUpdate('approximateBiodiversityCenterEcosystem', newValue);
    }
  };

  const handleEcosystemIncrement = () => {
    handleMatchDetailsAdjustment('approximateBiodiversityCenterEcosystem', 1);
  };

  const handleEcosystemDecrement = () => {
    handleMatchDetailsAdjustment('approximateBiodiversityCenterEcosystem', -1);
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
        <Col xs={24} md={12} lg={12}>
          <Typography.Title
            level={5}
            style={{
              textAlign: 'center',
              textTransform: 'capitalize',
              marginBottom: 16
            }}
          >
            Approx. Center Ecosystem
          </Typography.Title>
          <NumberInput
            value={match?.details?.approximateBiodiversityCenterEcosystem || 0}
            textFieldDisabled
            onChange={handleEcosystemChange}
            onIncrement={handleEcosystemIncrement}
            onDecrement={handleEcosystemDecrement}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default HeadRefereeExtra;
