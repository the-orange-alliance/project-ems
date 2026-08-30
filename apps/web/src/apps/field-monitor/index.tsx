import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from '@layouts/default-layout.js';
import { Card, Typography } from 'antd';
import {
  DriverstationMonitor,
  MatchMode,
  PrestartState,
  PrestartStatus
} from '@toa-lib/models';
import { TeamRow } from './components/team-row.js';
import { PrestartStatus as PrestartStatusIcon } from './components/prestart-status.js';
import { ConnectionChip } from 'src/components/util/connection-chip.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export const FrcFmsFieldMonitorApp: FC = () => {
  const [monitor, setMonitor] = useState<DriverstationMonitor>({
    dsStatuses: [],
    matchStatus: MatchMode.PRESTART,
    prestartStatus: {
      hardware: [],
      matchKey: { tournamentKey: '?', id: 0, eventKey: '' },
      state: PrestartState.NotReady
    }
  });
  const { worker, connected } = useSocketWorker();

  useEffect(() => {
    return () => {
      (worker as any)?.off('frc-fms:ds-update');
      (worker as any)?.off('frc-fms:prestart-status');
    };
  }, []);

  useEffect(() => {
    if (connected) {
      (worker as any)?.off('frc-fms:ds-update');
      (worker as any)?.on('frc-fms:ds-update', setMonitor);

      (worker as any)?.off('frc-fms:prestart-status');
      (worker as any)?.on('frc-fms:prestart-status', onPrestartStatus);
    }
  }, [connected]);

  const onPrestartStatus = (status: PrestartStatus) =>
    setMonitor({ ...monitor, prestartStatus: status });

  const friendlyMatchStatus = () => {
    switch (monitor?.matchStatus) {
      case MatchMode.PRESTART:
        return 'Prestart';
      case MatchMode.AUTONOMOUS:
        return 'Autonomous';
      case MatchMode.TRANSITION:
        return 'Transition';
      case MatchMode.TELEOPERATED:
        return 'Teleoperated';
      case MatchMode.ENDGAME:
        return 'Teleoperated/Endgame';
      case MatchMode.ENDED:
        return 'Match Over';
      case MatchMode.RESET:
        return 'Match Reset';
      default:
        return 'Unknown State/Not Prestarted';
    }
  };

  return (
    <DefaultLayout>
      <Card style={{ marginBottom: 8 }}>
        <div
          style={{
            width: '100%',
            margin: 0,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Match Number/Status Row */}
          <div style={{ maxHeight: '70px' }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              {/* Match Status */}
              <div style={{ flex: 2 }}>
                <Typography.Title level={4}>
                  Match {monitor?.prestartStatus.matchKey.tournamentKey ?? ''}-
                  {monitor?.prestartStatus.matchKey.id ?? 'None'}
                </Typography.Title>
              </div>

              {/* Match Mode */}
              <div
                style={{
                  flex: 8 - (monitor?.prestartStatus.hardware.length ?? 0)
                }}
              >
                <Typography.Title level={3}>
                  {friendlyMatchStatus()}
                  {monitor?.matchStatus === MatchMode.PRESTART &&
                    monitor?.prestartStatus.state ===
                      PrestartState.Prestarting &&
                    ' Initilized'}
                  {monitor?.matchStatus === MatchMode.PRESTART &&
                    monitor?.prestartStatus.state === PrestartState.Fail &&
                    ' Failed'}
                  {monitor?.matchStatus === MatchMode.PRESTART &&
                    monitor?.prestartStatus.state === PrestartState.Success &&
                    ' Complete'}
                </Typography.Title>
              </div>

              {/* Socket Connected Chip */}
              <div style={{ flex: 2 }}>
                <ConnectionChip />
              </div>

              {/* HW Prestart Statuses */}
              {monitor?.prestartStatus.hardware.map((hw) => (
                <PrestartStatusIcon hw={hw} key={hw.name} />
              ))}
            </div>
          </div>

          {/* Status Header Row */}
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)'
              }}
            >
              <div>Station</div>
              <div>Team Number</div>
              <div>DS</div>
              <div>BWU</div>
              <div>Radio</div>
              <div>Rio</div>
              <div>Battery</div>
              <div>Status</div>
              <div>Trip Time (ms)</div>
              <div>Missed Packets</div>
              <div>Radio Quality</div>
              <div>Radio Signal</div>
            </div>
          </div>

          {/* One row per DS */}
          {monitor?.dsStatuses?.map((ds) => (
            <TeamRow ds={ds} key={ds.allianceStation} />
          ))}
        </div>
      </Card>
    </DefaultLayout>
  );
};
