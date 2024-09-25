import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  Typography
} from '@mui/material';
import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from 'src/layouts/default-layout';
import { MatchSocketEvent, MatchKey } from '@toa-lib/models';
import { io } from 'socket.io-client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useMatchAll } from 'src/api/use-match-data';
import { useTeamIdentifiersForEventKey } from 'src/hooks/use-team-identifier';
import { DateTime } from 'luxon';

interface MonitorCardProps {
  field: number;
  url: string;
}

const MonitorCard: FC<MonitorCardProps> = ({ field, url }) => {
  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState<MatchKey | null>(null);
  const [status, setStatus] = useState('STANDBY');
  const { data: match } = useMatchAll(key);
  const identifiers = useTeamIdentifiersForEventKey(key?.eventKey);
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

  const createSocket = (autoConnect: boolean = false, token: string = '') => {
    return io(`ws://${url}`, {
      rejectUnauthorized: false,
      transports: ['websocket'],
      query: { token },
      autoConnect
    });
  };
  return (
    <Card>
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
      />
      <CardContent>
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
  );
};

export const EventMonitor: FC = () => {
  return (
    <DefaultLayout title='Event Monitor'>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={3}>
          <MonitorCard field={1} url='192.168.80.111:8081' />
        </Grid>
        <Grid item xs={12} sm={3}>
          <MonitorCard field={2} url='192.168.80.121:8081' />
        </Grid>
        <Grid item xs={12} sm={3}>
          <MonitorCard field={3} url='192.168.80.131:8081' />
        </Grid>
        <Grid item xs={12} sm={3}>
          <MonitorCard field={4} url='192.168.80.141:8081' />
        </Grid>
        <Grid item xs={12} sm={3}>
          <MonitorCard field={5} url='192.168.80.151:8081' />
        </Grid>
      </Grid>
    </DefaultLayout>
  );
};
