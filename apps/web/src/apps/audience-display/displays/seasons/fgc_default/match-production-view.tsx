import { FC, useEffect, useState } from 'react';
import { DisplayProps } from '../../displays.js';
import { Row } from 'antd';
import { EcoEquilibrium, EcoEquilibriumFCS, Match } from '@toa-lib/models';
import { useSocket } from 'src/api/use-socket.js';

const ScoreContainer: FC<{ number: string; label: string }> = ({
  number,
  label
}) => {
  return (
    <div>
      <div
        className='production-score-container'
        style={{
          height: '250px',
          width: '250px',
          border: '20px solid black',
          padding: '20px',
          textAlign: 'center',
          fontSize: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Tomarik Brush'
        }}
      >
        {number}
      </div>
      <h3 style={{ width: '100%', textAlign: 'center' }}>{label}</h3>
    </div>
  );
};

export const MatchProduction: FC<DisplayProps> = ({ match: genericMatch }) => {
  const matchParts = genericMatch.name.split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  const field = genericMatch.fieldNumber;
  const [socket] = useSocket();

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
    const math = 3 - level;
    if (math < 0) return 0;
    return math;
  };

  const dispenseRateStrings = ['Low', 'Medium', 'High'];
  const acceleratorStateStrings = ['Idle', 'Energizing', 'Deenergizing'];

  return (
    <Row>
      <ScoreContainer number={matchNumber} label={`Match Number`} />
      <ScoreContainer number={`${field}`} label={`Field`} />
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
        number={acceleratorStateStrings[redAcceleratorStatus.state]}
        label={'Red Side Accelerator State'}
      />
      <ScoreContainer
        number={dispenseRateStrings[redAcceleratorStatus.rate]}
        label={'Red Side Dispense Rate'}
      />
      <ScoreContainer
        number={`${redAcceleratorStatus.progress * 100}%`}
        label={'Red Side Energizing Progress'}
      />
      <ScoreContainer
        number={acceleratorStateStrings[blueAcceleratorStatus.state]}
        label={'Blue Side Accelerator State'}
      />
      <ScoreContainer
        number={dispenseRateStrings[blueAcceleratorStatus.rate]}
        label={'Blue Side Dispense Rate'}
      />
      <ScoreContainer
        number={`${blueAcceleratorStatus.progress * 100}%`}
        label={'Blue Side Energizing Progress'}
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
    </Row>
  );
};
