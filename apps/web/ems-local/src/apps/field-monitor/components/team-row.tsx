import { FC, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Tooltip,
  Typography
} from '@mui/material';
import { DriverstationStatus } from '@toa-lib/models';
import {
  SignalWifiOff,
  SignalWifi4Bar,
  SignalWifi3Bar,
  SignalWifi2Bar,
  SignalWifi1Bar,
  SignalWifi0Bar,
  DoNotDisturb
} from '@mui/icons-material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';

interface IProps {
  ds: DriverstationStatus;
}

export const TeamRow: FC<IProps> = ({ ds }: IProps) => {
  const [dataOpen, setDataOpen] = useState<boolean>(false);

  const friendlyStation =
    ds.allianceStation < 20
      ? `R${ds.allianceStation - 10}`
      : `B${ds.allianceStation - 20}`;
  const dsTextSplit = ds.robotStatus.versionData.ds.split('>');
  const rioTextSplit = ds.robotStatus.versionData.rio.split('>');
  const dsText = dsTextSplit.length > 1 ? dsTextSplit[1] : ``;
  const rioText = rioTextSplit.length > 1 ? rioTextSplit[1].substring(12) : ``;

  return (
    <Grid
      item
      sx={{
        backgroundColor: ds.robotStatus.brownout
          ? 'brown'
          : ds.allianceStation < 20
          ? '#ff6666'
          : '#6666ff',
        pb: 1
      }}
    >
      <Grid
        direction='row'
        container
        sx={{ fontSize: '20px' }}
        alignItems={'center'}
        onClick={() => setDataOpen(true)}
      >
        {/* Station */}
        <Grid item xs={1} sx={{ fontSize: '40px' }}>
          {friendlyStation}
        </Grid>

        {/* Team Number */}
        <Grid item xs={1} sx={{ fontSize: '30px' }}>
          {ds.teamKey}
        </Grid>

        {/* Driverstation */}
        <Grid item xs={1}>
          <Status
            status={ds.dsStatus.linked}
            optionalText={dsText}
            textSize='15px'
            title={ds.dsStatus.lastLog.split('<message>')[1]}
          />
        </Grid>

        {/* Bandwidth Usage */}
        <Grid item xs={1}>
          {ds.robotStatus.bandwidth}
        </Grid>

        {/* Radio */}
        <Grid item xs={1}>
          <Status status={ds.apStatus.linked} />
        </Grid>

        {/* Rio */}
        <Grid item xs={1} alignContent={'center'}>
          <Status
            status={ds.robotStatus.rioPing && ds.robotStatus.commsActive}
            optionalText={rioText}
            textSize={'10px'}
          />
        </Grid>

        {/* Battery */}
        <Grid item xs={1}>
          {ds.robotStatus.batteryVoltage.toFixed(2)}
        </Grid>

        {/* Status */}
        <Grid item xs={1} alignContent={'center'}>
          <Status
            status={ds.robotStatus.enabled}
            optionalText={ds.robotStatus.mode === 0 ? 'T' : 'A'}
            estop={ds.robotStatus.estop}
          />
        </Grid>

        {/* Trip Time */}
        <Grid item xs={1}>
          {ds.robotStatus.tripTimeMs}
        </Grid>

        {/* Missed Packets */}
        <Grid item xs={1}>
          {ds.dsStatus.missedPacketCount - ds.dsStatus.missedPacketOffset}
        </Grid>

        {/* Radio Quality */}
        <Grid item xs={1}>
          {ds.apStatus.quality[0]}/{ds.apStatus.quality[1]}
        </Grid>

        {/* Radio Signal */}
        <Grid item xs={1}>
          <WifiQuality signal={ds.apStatus.signal} />
        </Grid>
      </Grid>

      <DataPopup open={dataOpen} ds={ds} onClose={() => setDataOpen(false)} />
    </Grid>
  );
};

const Status = ({
  status,
  optionalText,
  estop,
  textSize,
  title
}: {
  status: boolean;
  optionalText?: string;
  estop?: boolean;
  textSize?: string;
  title?: string;
}) => {
  if (estop)
    return (
      <Box
        sx={{
          textAlign: 'center',
          background: '#000000',
          height: '52px',
          transform: 'rotate(45deg)',
          marginTop: '10px',
          width: '52px',
          border: '3px solid white',
          mx: 'auto'
        }}
      >
        <Typography
          sx={{
            color: '#FFFFFF',
            display: 'table-cell',
            height: '55px',
            transform: 'rotate(-45deg)',
            verticalAlign: 'middle',
            width: '55px',
            fontSize: '35px'
          }}
        >
          E
        </Typography>
      </Box>
    );

  // Otherwise show normal status
  return (
    <Tooltip title={title}>
      <Box
        sx={{
          backgroundColor: status ? 'green' : 'red',
          width: '75px',
          height: '75px',
          borderRadius: status ? '50px' : null,
          border: '3px solid black',
          fontSize: textSize ?? '50px',
          textAlign: 'center',
          mx: 'auto',
          wordBreak: 'break-all',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex'
        }}
      >
        {optionalText}
      </Box>
    </Tooltip>
  );
};

const WifiQuality = ({ signal }: { signal: string }) => {
  const GetIcon = () => {
    // If unknown, show no data
    if (signal.indexOf('unknown') > -1)
      return <SignalWifiOff sx={{ fontSize: '50px' }} />;

    // Parse quality
    const s = parseInt(signal.substring(0, signal.length - 4));

    if (s <= -90) {
      return <SignalWifi0Bar sx={{ fontSize: '50px' }} />;
    } else if (s <= -80) {
      return <SignalWifi1Bar sx={{ fontSize: '50px' }} />;
    } else if (s <= -70) {
      return <SignalWifi2Bar sx={{ fontSize: '50px' }} />;
    } else if (s <= -60) {
      return <SignalWifi3Bar sx={{ fontSize: '50px' }} />;
    } else {
      return <SignalWifi4Bar sx={{ fontSize: '50px' }} />;
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <GetIcon />
      <Typography>{signal}</Typography>
    </Box>
  );
};

const DataPopup = ({
  ds,
  open,
  onClose
}: {
  ds: DriverstationStatus;
  open: boolean;
  onClose: () => void;
}) => {
  const BooleanIndicator = ({ bool }: { bool: boolean }) =>
    bool ? <CheckCircleOutline /> : <DoNotDisturb />;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{ds.teamKey} Status</DialogTitle>
      <DialogContent>
        <Grid container direction='row'>
          {/* Robot Indicators */}
          <Grid item xs={6}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', textDecoration: 'underline' }}
            >
              Robot
            </Typography>
            <Typography>
              <b>Connected:</b>{' '}
              <BooleanIndicator bool={ds.robotStatus.rioPing} />
            </Typography>
            <Typography>
              <b>Comms Active: </b>{' '}
              <BooleanIndicator bool={ds.robotStatus.commsActive} />
            </Typography>
            <Typography>
              <b>Rio Version:</b> {ds.robotStatus.versionData.rio.split('>')[1]}
            </Typography>
            <Typography>
              <b>Brownout:</b>{' '}
              <BooleanIndicator bool={ds.robotStatus.brownout} />
            </Typography>
            <Typography>
              <b>Robot EStopped: </b>{' '}
              <BooleanIndicator bool={ds.robotStatus.estop} />
            </Typography>
            <Typography>
              <b>Trip Time: </b> {ds.robotStatus.tripTimeMs}
            </Typography>
            <Typography>
              <b>DS Disable/Robot Disable:</b>
              <BooleanIndicator
                bool={ds.robotStatus.additionalData.dsDisable}
              />
              <BooleanIndicator
                bool={ds.robotStatus.additionalData.robotDisable}
              />
            </Typography>
            <Typography>
              <b>DS Teleop/Robot Auto:</b>
              <BooleanIndicator bool={ds.robotStatus.additionalData.dsAuto} />
              <BooleanIndicator bool={ds.robotStatus.additionalData.dsAuto} />
            </Typography>
            <Typography>
              <b>DS Teleop/Robot Teleop:</b>
              <BooleanIndicator bool={ds.robotStatus.additionalData.dsTele} />
              <BooleanIndicator
                bool={ds.robotStatus.additionalData.robotTele}
              />
            </Typography>
          </Grid>

          {/* FMS Commands / AP Statuses */}
          <Grid item xs={6}>
            {/* FMS Commands */}
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', textDecoration: 'underline' }}
            >
              FMS Commands
            </Typography>
            <Typography>
              <b>Bypassed:</b> <BooleanIndicator bool={ds.fmsStatus.bypassed} />
            </Typography>
            <Typography>
              <b>FMS Commanding Auto:</b>{' '}
              <BooleanIndicator bool={ds.fmsStatus.auto} />
            </Typography>
            <Typography>
              <b>FMS Commanding Enable:</b>{' '}
              <BooleanIndicator bool={ds.fmsStatus.enabled} />
            </Typography>
            <Typography>
              <b>FMS Commanding EStop:</b>{' '}
              <BooleanIndicator bool={ds.fmsStatus.estop} />
            </Typography>

            {/* AP Statuses */}
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', textDecoration: 'underline', mt: 1 }}
            >
              AP Statuses
            </Typography>
            <Typography>
              <b>Linked: </b> <BooleanIndicator bool={ds.apStatus.linked} />
            </Typography>
            <Typography>
              <b>Quality: </b> {ds.apStatus.quality[0]}/{ds.apStatus.quality[1]}
            </Typography>
            <Typography>
              <b>Signal: </b> {ds.apStatus.signal}
            </Typography>
          </Grid>
        </Grid>

        <Grid container direction='row'>
          <Grid item></Grid>
        </Grid>

        {/* Driverstation Indicators */}
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold', textDecoration: 'underline', mt: 2 }}
        >
          Driverstation
        </Typography>
        <Typography>
          <b>Connected:</b> <BooleanIndicator bool={ds.dsStatus.linked} />
        </Typography>
        <Typography>
          <b>Version:</b> {ds.robotStatus.versionData.ds.split('>')[1]}
        </Typography>
        <Typography>
          <b>PC CPU Utilization:</b> {ds.dsStatus.computerCpuPercent}%
        </Typography>
        <Typography>
          <b>PC Battery:</b> {ds.dsStatus.computerBatteryPercent}%
        </Typography>
        <Typography>
          <b>IP Address:</b> {ds.dsStatus.ipAddress}
        </Typography>
        <Typography>
          <b>Missed Packet Count:</b> {ds.dsStatus.missedPacketCount}
        </Typography>
        <Typography>
          <b>Last Log:</b>
        </Typography>
        <Typography>{ds.dsStatus.lastLog.split('<message>')[1]}</Typography>
      </DialogContent>
      <DialogActions>
        <Button variant='contained' onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
