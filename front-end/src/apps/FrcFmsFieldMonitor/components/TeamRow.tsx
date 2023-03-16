import { FC } from 'react';
import { Box, Grid, Tooltip, Typography } from '@mui/material';
import { DriverstationStatus } from '@toa-lib/models';
import { SignalWifiOff, SignalWifi4Bar, SignalWifi3Bar, SignalWifi2Bar, SignalWifi1Bar, SignalWifi0Bar } from '@mui/icons-material'

interface IProps {
  ds: DriverstationStatus
}

const TeamRow: FC<IProps> = ({ ds }: IProps) => {

  const friendlyStation = ds.allianceStation < 20 ? `R${ds.allianceStation - 10}` : `B${ds.allianceStation - 20}`
  const dsTextSplit = ds.robotStatus.versionData.ds.split(">");
  const rioTextSplit = ds.robotStatus.versionData.rio.split(">");
  const dsText = (dsTextSplit.length > 1 ? dsTextSplit[1] : ``);
  const rioText = (rioTextSplit.length > 1 ? rioTextSplit[1].substring(12) : ``);


  return (

    <Grid item sx={{ backgroundColor: ds.allianceStation < 20 ? "#ff6666" : "#6666ff", pb: 1 }}>
      <Grid direction="row" container sx={{ fontSize: "20px" }} alignItems={"center"}>
        {/* Station */}
        <Grid item xs={1} sx={{ fontSize: "40px" }}>{friendlyStation}</Grid>

        {/* Team Number */}
        <Grid item xs={1} sx={{ fontSize: "30px" }}>{ds.teamKey}</Grid>

        {/* Driverstation */}
        <Grid item xs={1}>
          <Status
            status={ds.dsStatus.linked}
            optionalText={dsText}
            textSize="18px"
            title={ds.dsStatus.lastLog.split("<message>")[1]}
          />
        </Grid>

        {/* Bandwidth Usage */}
        <Grid item xs={1}>Future</Grid>

        {/* Radio */}
        <Grid item xs={1}><Status status={ds.apStatus.linked} /></Grid>

        {/* Rio */}
        <Grid item xs={1} alignContent={"center"}>
          <Status status={ds.robotStatus.rioPing && ds.robotStatus.commsActive} optionalText={rioText} textSize={"18px"} />
        </Grid>

        {/* Battery */}
        <Grid item xs={1}>{ds.robotStatus.batteryVoltage.toFixed(2)}</Grid>

        {/* Status */}
        <Grid item xs={1} alignContent={"center"}><Status status={ds.robotStatus.enabled} optionalText={ds.robotStatus.mode === 0 ? "T" : "A"} estop={ds.robotStatus.estop} /></Grid>

        {/* Trip Time */}
        <Grid item xs={1}>{ds.robotStatus.tripTimeMs}</Grid>

        {/* Missed Packets */}
        <Grid item xs={1}>{ds.dsStatus.missedPacketCount - ds.dsStatus.missedPacketOffset}</Grid>

        {/* Radio Quality */}
        <Grid item xs={1}>{ds.apStatus.quality[0]}/{ds.apStatus.quality[1]}</Grid>

        {/* Radio Signal */}
        <Grid item xs={1}><WifiQuality signal={ds.apStatus.signal} /></Grid>
      </Grid>
    </Grid>
  );
};

const Status = ({ status, optionalText, estop, textSize, title }: { status: boolean, optionalText?: string, estop?: boolean, textSize?: string, title?: string }) => {
  if (estop) return (
    <Box
      sx={{
        textAlign: 'center',
        background: '#000000',
        height: '52px',
        transform: 'rotate(45deg)',
        marginTop: '10px',
        width: '52px',
        border: '3px solid white',
        mx: "auto"
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
          fontSize: '35px',
        }}
      >
        E
      </Typography>
    </Box>
  )

  // Otherwise show normal status
  return (
    <Tooltip title={title}>
      <Box
        sx={{
          backgroundColor: status ? "green" : "red",
          width: "75px", height: "75px",
          borderRadius: status ? "50px" : null,
          border: "3px solid black",
          fontSize: textSize ?? "50px",
          textAlign: "center",
          mx: "auto",
          wordBreak: 'break-all'
        }}
      >
        {optionalText}
      </Box>
    </Tooltip>
  )
}

const WifiQuality = ({ signal }: { signal: string }) => {

  const GetIcon = () => {
    // If unknown, show no data
    if (signal.indexOf('unknown') > -1) return <SignalWifiOff sx={{ fontSize: "50px" }} />

    // Parse quality
    const s = parseInt(signal.substring(0, signal.length - 4));

    if (s <= -90) {
      return <SignalWifi0Bar sx={{ fontSize: "50px" }} />
    } else if (s <= -80) {
      return <SignalWifi1Bar sx={{ fontSize: "50px" }} />
    } else if (s <= -70) {
      return <SignalWifi2Bar sx={{ fontSize: "50px" }} />
    } else if (s <= -60) {
      return <SignalWifi3Bar sx={{ fontSize: "50px" }} />
    } else {
      return <SignalWifi4Bar sx={{ fontSize: "50px" }} />
    }
  }

  return (
    <Box sx={{ textAlign: "center" }}>
      <GetIcon />
      <Typography>{signal}</Typography>
    </Box>
  )
}

export default TeamRow;
