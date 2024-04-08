import { FC, useEffect, useState } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import Paper from '@mui/material/Paper';
import { Grid, Typography } from '@mui/material';
import {
  DriverstationMonitor,
  MatchMode,
  PrestartState,
  PrestartStatus
} from '@toa-lib/models';
import { TeamRow } from './components/team-row';
import { PrestartStatus as PrestartStatusIcon } from './components/prestart-status';
import ConnectionChip from 'src/components/util/ConnectionChip/ConnectionChip';
import { useSocket } from 'src/api/use-socket';

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
  const [socket, connected] = useSocket();

  useEffect(() => {
    return () => {
      socket?.off('frc-fms:ds-update');
      socket?.off('frc-fms:prestart-status');
    };
  }, []);

  useEffect(() => {
    if (connected) {
      socket?.off('frc-fms:ds-update');
      socket?.on('frc-fms:ds-update', setMonitor);

      socket?.off('frc-fms:prestart-status');
      socket?.on('frc-fms:prestart-status', onPrestartStatus);
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
      <Paper sx={{ marginBottom: (theme) => theme.spacing(1) }}>
        <Grid
          direction='column'
          container
          sx={{ width: '100%', m: 0, textAlign: 'center' }}
        >
          {/* Match Number/Status Row */}
          <Grid item sx={{ maxHeight: '70px' }}>
            <Grid direction='row' container>
              {/* Match Status */}
              <Grid item xs={2}>
                <Typography variant='h5'>
                  Match {monitor?.prestartStatus.matchKey.tournamentKey ?? ''}-
                  {monitor?.prestartStatus.matchKey.id ?? 'None'}
                </Typography>
              </Grid>

              {/* Match Mode */}
              <Grid
                item
                xs={8 - (monitor?.prestartStatus.hardware.length ?? 0)}
              >
                <Typography variant='h4'>
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
                </Typography>
              </Grid>

              {/* Socket Connected Chip */}
              <Grid item xs={2}>
                <ConnectionChip />
              </Grid>

              {/* HW Prestart Statuses */}
              {monitor?.prestartStatus.hardware.map((hw) => (
                <PrestartStatusIcon hw={hw} key={hw.name} />
              ))}
            </Grid>
          </Grid>

          {/* Status Header Row */}
          <Grid item>
            <Grid direction='row' container>
              <Grid item xs={1}>
                Station
              </Grid>
              <Grid item xs={1}>
                Team Number
              </Grid>
              <Grid item xs={1}>
                DS
              </Grid>
              <Grid item xs={1}>
                BWU
              </Grid>
              <Grid item xs={1}>
                Radio
              </Grid>
              <Grid item xs={1}>
                Rio
              </Grid>
              <Grid item xs={1}>
                Battery
              </Grid>
              <Grid item xs={1}>
                Status
              </Grid>
              <Grid item xs={1}>
                Trip Time (ms)
              </Grid>
              <Grid item xs={1}>
                Missed Packets
              </Grid>
              <Grid item xs={1}>
                Radio Quality
              </Grid>
              <Grid item xs={1}>
                Radio Signal
              </Grid>
            </Grid>
          </Grid>

          {/* One row per DS */}
          {monitor?.dsStatuses?.map((ds) => (
            <TeamRow ds={ds} key={ds.allianceStation} />
          ))}
        </Grid>
      </Paper>
    </DefaultLayout>
  );
};
