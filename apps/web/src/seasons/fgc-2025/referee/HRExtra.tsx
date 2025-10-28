import { useModal } from '@ebay/nice-modal-react';
import {
  EcoEquilibrium,
  EcoEquilibriumFCS,
  ItemUpdate,
  MatchSocketEvent,
  MatchState,
  NumberAdjustment
} from '@toa-lib/models';
import { Row, Col, Typography, Card } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';
import { ForceConfirm } from './confirm-force-dialog.js';
const HeadRefereeExtra: React.FC = () => {
  const [socket] = useSocket();
  const [match, setMatch] = useAtom(matchAtom);
  const matchState = useAtomValue(matchStateAtom);
  const [ecosystemState, setEcosystemState] = useState<number>(0);
  const forceModal = useModal(ForceConfirm);

  useEffect(() => {
    const updateEcosystemState = (s: EcoEquilibriumFCS.EcosystemUpdate) => {
      if (s.ecosystem === EcoEquilibriumFCS.Ecosystem.Center) {
        setEcosystemState(s.position);
      }
    };

    socket?.on(
      EcoEquilibriumFCS.SocketEvents.EcosystemUpdate,
      updateEcosystemState
    );
    return () => {
      socket?.off(
        EcoEquilibriumFCS.SocketEvents.EcosystemUpdate,
        updateEcosystemState
      );
    };
  }, []);

  const forceEcosystem = async (newState: number) => {
    if (await forceModal.show({ level: (newState + 1).toString() })) {
      socket?.emit(EcoEquilibriumFCS.SocketEvents.ForceEcosystemUpdate, {
        ecosystem: EcoEquilibriumFCS.Ecosystem.Center,
        position: newState
      } as EcoEquilibriumFCS.EcosystemUpdate);
    }
  };

  const postMatch = matchState > MatchState.MATCH_IN_PROGRESS;

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

  const handleEcosystemApproxChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      handleMatchDetailsUpdate(
        'approximateBiodiversityCenterEcosystem',
        newValue
      );
    }
  };

  const handleEcosystemApproxIncrement = () => {
    handleMatchDetailsAdjustment('approximateBiodiversityCenterEcosystem', 1);
  };

  const handleEcosystemApproxDecrement = () => {
    handleMatchDetailsAdjustment('approximateBiodiversityCenterEcosystem', -1);
  };

  const handleEcosystemExactChange = (
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      handleMatchDetailsUpdate('biodiversityUnitsCenterEcosystem', newValue);
    }
  };

  const handleEcosystemExactIncrement = () => {
    handleMatchDetailsAdjustment('biodiversityUnitsCenterEcosystem', 1);
  };

  const handleEcosystemExactDecrement = () => {
    handleMatchDetailsAdjustment('biodiversityUnitsCenterEcosystem', -1);
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
            Approx. Center Ecosystem
          </Typography.Title>
          <NumberInput
            value={match?.details?.approximateBiodiversityCenterEcosystem || 0}
            textFieldDisabled
            disabled={postMatch}
            onChange={handleEcosystemApproxChange}
            onIncrement={handleEcosystemApproxIncrement}
            onDecrement={handleEcosystemApproxDecrement}
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
              Exact Center Ecosystem
            </Typography.Title>
            <NumberInput
              value={match?.details?.biodiversityUnitsCenterEcosystem || 0}
              onChange={handleEcosystemExactChange}
              onIncrement={handleEcosystemExactIncrement}
              onDecrement={handleEcosystemExactDecrement}
            />
          </Col>
        )}

        <Col xs={24}>
          <StateToggle
            title='Force Center Ecosystem'
            states={[0, 1, 2, 3]}
            stateLabels={[
              '4 Barriers Remain',
              '3 Barriers Remains',
              '2 Barrier Remains',
              '1/0 Barriers Remain'
            ]}
            value={ecosystemState}
            onChange={forceEcosystem}
            fullWidth
          />
        </Col>
      </Row>
    </Card>
  );
};

export default HeadRefereeExtra;
