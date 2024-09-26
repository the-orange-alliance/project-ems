import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import { useMatchAll } from 'src/api/use-match-data';
import { useTeamIdentifiersForEventKey } from 'src/hooks/use-team-identifier';
import { DateTime } from 'luxon';
import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from 'src/layouts/default-layout';
import { MatchSocketEvent, MatchKey, Match } from '@toa-lib/models';
import { io } from 'socket.io-client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface MonitorCardProps {
  field: number;
  address: string;
  realtimePort: number;
}

const MonitorCard: FC<MonitorCardProps> = ({
  field,
  address,
  realtimePort
}) => {
  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState<MatchKey | null>(null);
  const [status, setStatus] = useState('STANDBY');
  const { data: match } = useMatchAll(key);
  const identifiers = useTeamIdentifiersForEventKey(key?.eventKey);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const socket = createSocket();
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(MatchSocketEvent.PRESTART, handlePrestart);
    socket.on(MatchSocketEvent.START, handleStart);
    socket.on(MatchSocketEvent.ABORT, handleAbort);
    socket.on(MatchSocketEvent.END, handleEnd);
    socket.on(MatchSocketEvent.COMMIT, handleCommit);
    socket.connect();
    socket.emit('rooms', ['match']);
    return () => {
      socket.off(MatchSocketEvent.PRESTART, handlePrestart);
      socket.off(MatchSocketEvent.START, handleStart);
      socket.off(MatchSocketEvent.ABORT, handleAbort);
      socket.off(MatchSocketEvent.END, handleEnd);
      socket.off(MatchSocketEvent.COMMIT, handleCommit);
    };
  }, []);

  const handleConnect = () => setConnected(true);
  const handleDisconnect = () => setConnected(false);

  const handlePrestart = (key: MatchKey) => {
    setKey(key);
    setStatus('PRESTART');
  };
  const handleStart = () => {
    setStatus('IN PROGRESS');
  };
  const handleAbort = () => {
    setStatus('ABORTED');
  };
  const handleEnd = () => {
    setStatus('COMPLETE');
  };
  const handleCommit = () => {
    setStatus('COMMITTED');
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  const createSocket = (autoConnect: boolean = false, token: string = '') => {
    return io(`ws://${address}:${realtimePort}`, {
      rejectUnauthorized: false,
      transports: ['websocket'],
      query: { token },
      autoConnect
    });
  };
  return (
    <>
      <Card
        onClick={() => {
          setDialogOpen(true);
        }}
        style={{ cursor: 'pointer' }}
      >
        <Menu
          id={`field-${field}-menu`}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': `field-${field}-menu`
          }}
        >
          <MenuItem>
            <Link href={`http://${address}`}>Open</Link>
          </MenuItem>
          <MenuItem onClick={handleClose}>Refresh</MenuItem>
        </Menu>
        <CardHeader
          title={`Field ${field}`}
          subheader={
            connected
              ? match
                ? `${match?.name} - ${status}`
                : status
              : 'OFFLINE'
          }
          avatar={
            connected ? (
              <CheckCircleIcon color='success' />
            ) : (
              <ErrorIcon color='error' />
            )
          }
          action={
            <IconButton
              aria-controls={open ? `field-${field}-menu` : undefined}
              aria-haspopup='true'
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
            >
              <MoreVertIcon />
            </IconButton>
          }
        />
        <CardContent>
          <MatchDetails key={field} match={match} identifiers={identifiers} />
        </CardContent>
        <CardActions>
          <Typography variant='body2' sx={{ marginLeft: 'auto' }}>
            {match
              ? DateTime.now() <= DateTime.fromISO(match.startTime)
                ? DateTime.now()
                    .diff(DateTime.fromISO(match.scheduledTime))
                    .shiftTo('hours', 'minutes')
                    .toFormat(`h'h' m'm' 'behind'`)
                : DateTime.fromISO(match.scheduledTime)
                    .diff(DateTime.now())
                    .shiftTo('hours', 'minutes')
                    .toFormat(`h'h' m'm' 'ahead'`)
              : ''}
          </Typography>
        </CardActions>
      </Card>
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
        }}
        fullWidth={true}
        maxWidth={'lg'}
      >
        <DialogTitle>{`Field ${field}`}</DialogTitle>
        <DialogContent>
          <MatchDetails key={field} match={match} identifiers={identifiers} />
        </DialogContent>
      </Dialog>
    </>
  );
};

interface MatchDetailsProps {
  match: Match<any> | undefined;
  identifiers: Record<number, string>;
}

const MatchDetails: FC<MatchDetailsProps> = ({ match, identifiers }) => {
  return (
    <Grid container>
      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {match && match.participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${match.participants[0].team?.countryCode}`}
              />{' '}
              {identifiers[match?.participants?.[0].teamKey]}
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>
      <Grid item xs={4} />
      <Grid item xs={4}>
        <Typography align='right' className='blue'>
          {match && match.participants ? (
            <>
              {identifiers[match?.participants?.[3].teamKey]}{' '}
              <span
                className={`flag-icon flag-icon-${match.participants[3].team?.countryCode}`}
              />
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {match && match.participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${match.participants[1].team?.countryCode}`}
              />{' '}
              {identifiers[match?.participants?.[1].teamKey]}
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>
      <Grid item xs={4}>
        <Typography align='center'>vs.</Typography>
      </Grid>
      <Grid item xs={4}>
        <Typography align='right' className='blue'>
          {match && match.participants ? (
            <>
              {identifiers[match?.participants?.[4].teamKey]}{' '}
              <span
                className={`flag-icon flag-icon-${match.participants[4].team?.countryCode}`}
              />
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {match && match.participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${match.participants[2].team?.countryCode}`}
              />{' '}
              {identifiers[match?.participants?.[2].teamKey]}
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>
      <Grid item xs={4} />
      <Grid item xs={4}>
        <Typography align='right' className='blue'>
          {match && match.participants ? (
            <>
              {identifiers[match?.participants?.[5].teamKey]}{' '}
              <span
                className={`flag-icon flag-icon-${match.participants[5].team?.countryCode}`}
              />
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <Typography align='center' className='red'>
          {match ? match.redScore : '--'}
        </Typography>
      </Grid>
      <Grid item xs={4} />
      <Grid item xs={4}>
        <Typography align='center' className='blue'>
          {match ? match.blueScore : '--'}
        </Typography>
      </Grid>
    </Grid>
  );
};

export const EventMonitor: FC = () => {
  return (
    <DefaultLayout title='Event Monitor'>
      <Grid container spacing={3} columns={10}>
        <Grid item md={2}>
          <MonitorCard field={5} address='192.168.80.151' realtimePort={8081} />
        </Grid>
        <Grid item md={2}>
          <MonitorCard field={4} address='192.168.80.141' realtimePort={8081} />
        </Grid>
        <Grid item md={2}>
          <MonitorCard field={3} address='192.168.80.131' realtimePort={8081} />
        </Grid>
        <Grid item md={2}>
          <MonitorCard field={2} address='192.168.80.121' realtimePort={8081} />
        </Grid>
        <Grid item md={2}>
          <MonitorCard field={1} address='192.168.80.111' realtimePort={8081} />
        </Grid>
      </Grid>
    </DefaultLayout>
  );
};
