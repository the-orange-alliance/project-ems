import { Card, CardContent, CardHeader, Grid } from '@mui/material';
import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from 'src/layouts/default-layout';
import { MatchSocketEvent, MatchKey } from '@toa-lib/models';
import { io } from 'socket.io-client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useMatchAll } from 'src/api/use-match-data';

interface MonitorCardProps {
  field: number;
  url: string;
}

const MonitorCard: FC<MonitorCardProps> = ({ field, url }) => {
  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState<MatchKey | null>(null);
  const [status, setStatus] = useState('STANDBY');
  const { data: match } = useMatchAll(key);
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
      <CardContent>Event Monitor&nbsp;{connected}</CardContent>
    </Card>
  );
};

export const EventMonitor: FC = () => {
  return (
    <DefaultLayout title='Event Monitor'>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <MonitorCard field={1} url='192.168.80.111:8081' />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MonitorCard field={2} url='192.168.80.121:8081' />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MonitorCard field={3} url='192.168.80.131:8081' />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MonitorCard field={4} url='192.168.80.141:8081' />
        </Grid>
        <Grid item xs={12} sm={4}>
          <div>HERE</div>
        </Grid>
        <Grid item xs={12} sm={4}>
          <MonitorCard field={5} url='192.168.80.151:8081' />
        </Grid>
      </Grid>
    </DefaultLayout>
  );
};
