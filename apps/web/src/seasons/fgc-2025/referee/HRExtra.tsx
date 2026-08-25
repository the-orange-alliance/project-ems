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
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { StateToggle } from 'src/components/inputs/state-toggle.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';
import { ForceConfirm } from './confirm-force-dialog.js';
import * as Comlink from 'comlink';

const HeadRefereeExtra: React.FC = () => {
  const { worker } = useSocketWorker();
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

    const ecosystemProxy = Comlink.proxy(updateEcosystemState);

    worker?.on(EcoEquilibriumFCS.SocketEvents.EcosystemUpdate, ecosystemProxy);
    return () => {
      worker?.off(
        EcoEquilibriumFCS.SocketEvents.EcosystemUpdate,
        ecosystemProxy
      );
    };
  }, []);

  const forceEcosystem = async (newState: number) => {
    if (await forceModal.show({ level: (newState + 1).toString() })) {
      worker?.emit(EcoEquilibriumFCS.SocketEvents.ForceEcosystemUpdate, {
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
    detailsKey: keyof EcoEquilibrium.MatchDetails,
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

  const handleAllBarriersClearedChange = (newValue: number) => {
    handleMatchDetailsUpdate('allBarriersCleared', newValue);
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

        <Col xs={24}>
          <StateToggle
            title='All Barriers Cleared'
            states={[0, 1]}
            stateLabels={['No', 'Yes']}
            value={match?.details?.allBarriersCleared || 0}
            onChange={handleAllBarriersClearedChange}
            fullWidth
          />
        </Col>
      </Row>
    </Card>
  );
};

export default HeadRefereeExtra;
