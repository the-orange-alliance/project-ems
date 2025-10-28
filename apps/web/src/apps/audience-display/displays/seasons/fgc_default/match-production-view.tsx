import { FC, useEffect, useState } from 'react';
import { DisplayProps } from '../../displays.js';
import { Row } from 'antd';
import {
  EcoEquilibrium,
  EcoEquilibriumFCS,
  Match,
  MatchState
} from '@toa-lib/models';
import { useSocket } from 'src/api/use-socket.js';
import { useAtomValue } from 'jotai';
import { matchStateAtom, matchStatusAtom } from 'src/stores/state/match.js';

const ScoreContainer: FC<{
  number: string;
  label: string;
  wide?: boolean;
  medium?: boolean;
  bg?: string;
  smallFont?: boolean;
}> = ({ number, label, medium, wide, bg, smallFont }) => {
  return (
    <div>
      <div
        className='production-score-container'
        style={{
          height: '200px',
          width: wide
            ? 'calc(100vw / 2) '
            : medium
              ? 'calc(100vw / 4)'
              : '250px',
          border: '20px solid black',
          textAlign: 'center',
          fontSize: smallFont ? '40px' : '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Tomarik Brush',
          backgroundColor: bg ? bg : undefined,
          paddingBottom: '30px'
        }}
      >
        {number}
      </div>
      <h3 style={{ width: '100%', textAlign: 'center', marginBottom: 0 }}>
        {label}
      </h3>
    </div>
  );
};

export const MatchProduction: FC<DisplayProps> = ({ match: genericMatch }) => {
  const matchParts = genericMatch.name.split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  const field = genericMatch.fieldNumber;
  const [socket, socketConnected] = useSocket();

  const match = genericMatch as Match<EcoEquilibrium.MatchDetails>;

  const [redAcceleratorStatus, setRedAcceleratorStatus] =
    useState<EcoEquilibriumFCS.AcceleratorStatus>({
      state: EcoEquilibriumFCS.AcceleratorState.Idle,
      rate: EcoEquilibriumFCS.FlowRate.Low,
      progress: 0
    });
  const [blueAcceleratorStatus, setBlueAcceleratorStatus] =
    useState<EcoEquilibriumFCS.AcceleratorStatus>({
      state: EcoEquilibriumFCS.AcceleratorState.Idle,
      rate: EcoEquilibriumFCS.FlowRate.Low,
      progress: 0
    });
  const [redEcoLevel, setRedEcoLevel] = useState(0);
  const [blueEcoLevel, setBlueEcoLevel] = useState(0);
  const [centerEcoLevel, setCenterEcoLevel] = useState(0);
  const [biodiversityDispensed, setBiodiversityDispensed] = useState({
    red: 0,
    blue: 0
  });

  const updateEcosystem = (payload: EcoEquilibriumFCS.EcosystemUpdate) => {
    if (payload.ecosystem === EcoEquilibriumFCS.Ecosystem.RedSide) {
      setRedEcoLevel(payload.position);
    } else if (payload.ecosystem === EcoEquilibriumFCS.Ecosystem.BlueSide) {
      setBlueEcoLevel(payload.position);
    } else if (payload.ecosystem === EcoEquilibriumFCS.Ecosystem.Center) {
      setCenterEcoLevel(payload.position);
    }
  };

  const updateAcceleration = (payload: EcoEquilibriumFCS.AcceleratorUpdate) => {
    if (payload.side === EcoEquilibriumFCS.FieldSide.Red) {
      setRedAcceleratorStatus(payload.status);
    } else if (payload.side === EcoEquilibriumFCS.FieldSide.Blue) {
      setBlueAcceleratorStatus(payload.status);
    }
  };

  const updateDispenser = (payload: EcoEquilibriumFCS.DispenserUpdate) => {
    if (payload.side === EcoEquilibriumFCS.FieldSide.Red) {
      setBiodiversityDispensed((prev) => ({
        ...prev,
        red: payload.biodiversityDispensed
      }));
    } else if (payload.side === EcoEquilibriumFCS.FieldSide.Blue) {
      setBiodiversityDispensed((prev) => ({
        ...prev,
        blue: payload.biodiversityDispensed
      }));
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on(EcoEquilibriumFCS.SocketEvents.EcosystemUpdate, updateEcosystem);
    socket.on(
      EcoEquilibriumFCS.SocketEvents.AccelerationUpdate,
      updateAcceleration
    );
    socket.on(
      EcoEquilibriumFCS.SocketEvents.BiodiversityDispensedUpdate,
      updateDispenser
    );
    return () => {
      socket.off(
        EcoEquilibriumFCS.SocketEvents.EcosystemUpdate,
        updateEcosystem
      );
      socket.off(
        EcoEquilibriumFCS.SocketEvents.AccelerationUpdate,
        updateAcceleration
      );
      socket.off(
        EcoEquilibriumFCS.SocketEvents.BiodiversityDispensedUpdate,
        updateDispenser
      );
    };
  }, [socket]);

  const getRemainingFromLevel = (level: number) => {
    const math = 4 - level;
    if (math < 0) return 0;
    return math;
  };

  const dispenseRateStrings = ['Low', 'Medium', 'High'];
  const acceleratorStateStrings = ['Idle', 'Energizing', 'Deenergizing'];
  const matchStateStrings: Record<MatchState, string> = {
    [MatchState.AUDIENCE_READY]: 'Audience Ready',
    [MatchState.FIELD_READY]: 'Field Ready',
    [MatchState.MATCH_ABORTED]: 'Match Aborted',
    [MatchState.MATCH_COMPLETE]: 'Match Complete',
    [MatchState.MATCH_NOT_SELECTED]: 'Match Not Selected',
    [MatchState.MATCH_READY]: 'Match Ready',
    [MatchState.PRESTART_COMPLETE]: 'Prestart Complete',
    [MatchState.PRESTART_READY]: 'Prestart Ready',
    [MatchState.RESULTS_COMMITTED]: 'Results Committed',
    [MatchState.RESULTS_POSTED]: 'Results Posted',
    [MatchState.RESULTS_READY]: 'Results Ready',
    [MatchState.MATCH_IN_PROGRESS]: 'Match In Progress'
  };

  const matchState = useAtomValue(matchStateAtom);
  const matchStatus = useAtomValue(matchStatusAtom);

  const matchString =
    matchStateStrings[matchState].toLowerCase() === matchStatus.toLowerCase()
      ? matchStateStrings[matchState]
      : `${matchStateStrings[matchState]} \n (${matchStatus})`;

  return (
    <>
      <Row>
        <ScoreContainer
          number={socketConnected ? 'Y' : 'N'}
          label={`Socket Connected`}
          bg={socketConnected ? '#4caf50' : '#f44336'}
        />
        <ScoreContainer number={matchNumber} label={`Match Number`} />
        <ScoreContainer number={`${field}`} label={`Field`} />
        <ScoreContainer
          number={matchString}
          label={`Match State`}
          medium
          smallFont
        />
      </Row>
      <Row>
        <ScoreContainer
          number={getRemainingFromLevel(redEcoLevel).toString()}
          label={'Red Side Eco Barrier Remain'}
        />
        <ScoreContainer
          number={getRemainingFromLevel(blueEcoLevel).toString()}
          label={'Blue Side Eco Barrier Remain'}
        />
        <ScoreContainer
          number={getRemainingFromLevel(centerEcoLevel).toString()}
          label={'Center Eco Barrier Remain'}
        />
        <ScoreContainer
          number={
            match && match.details
              ? match.details.barriersInRedMitigator.toString()
              : ''
          }
          label={'Barriers Scored Red Mitigator'}
        />
        <ScoreContainer
          number={
            match && match.details
              ? match.details.barriersInBlueMitigator.toString()
              : ''
          }
          label={'Barriers Scored Blue Mitigator'}
        />
        <ScoreContainer
          number={biodiversityDispensed.red.toString()}
          label={'Red Side Biodiversity Dispensed'}
        />
        <ScoreContainer
          number={biodiversityDispensed.blue.toString()}
          label={'Blue Side Biodiversity Dispensed'}
        />
        <ScoreContainer
          number={`${(redAcceleratorStatus.progress * 100).toFixed(0)}%`}
          medium
          label={'Red Side Energizing Progress'}
        />
        <ScoreContainer
          number={`${(blueAcceleratorStatus.progress * 100).toFixed(0)}%`}
          medium
          label={'Blue Side Energizing Progress'}
        />
      </Row>

      <Row style={{ width: '100vw', marginTop: '0px' }}>
        <ScoreContainer
          number={dispenseRateStrings[redAcceleratorStatus.rate]}
          wide
          label={'Red Side Dispense Rate'}
        />
        <ScoreContainer
          number={dispenseRateStrings[blueAcceleratorStatus.rate]}
          wide
          label={'Blue Side Dispense Rate'}
        />
        <ScoreContainer
          number={acceleratorStateStrings[redAcceleratorStatus.state]}
          wide
          label={'Red Side Accelerator State'}
        />
        <ScoreContainer
          number={acceleratorStateStrings[blueAcceleratorStatus.state]}
          wide
          label={'Blue Side Accelerator State'}
        />
      </Row>
    </>
  );
};
