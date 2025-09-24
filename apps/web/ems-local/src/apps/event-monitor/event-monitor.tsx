import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography
} from '@mui/material';
import { useMatchAll } from 'src/api/use-match-data';
import { DateTime } from 'luxon';
import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from 'src/layouts/default-layout';
import {
  MatchSocketEvent,
  MatchKey,
  Match,
  FieldControlStatus,
  Team
} from '@toa-lib/models';
import { io, Socket } from 'socket.io-client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningIcon from '@mui/icons-material/Warning';
import { useTeamsForEvent } from 'src/api/use-team-data';

interface MonitorCardProps {
  field: number;
  address: string;
  realtimePort: number;
  teams?: Team[];
}

const MonitorCard: FC<MonitorCardProps> = ({
  field,
  address,
  realtimePort,
  teams
}) => {
  const webUrl = `http://${address}`;
  const socketUrl = `ws://${address}:${realtimePort}`;

  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState<MatchKey | null>(null);
  const [status, setStatus] = useState('STANDBY');
  const { data: currentMatch } = useMatchAll(key);
  const [socket, setSocket] = useState<null | Socket>(null);
  const [match, setMatch] = useState<Match<any> | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  };
  const handleRefresh = () => {
    console.log('Refresh but idk how to');
  };
  const [fcsStatus, setFcsStatus] = useState<FieldControlStatus | null>(null);

  useEffect(() => {
    const socket = createSocket();
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(MatchSocketEvent.PRESTART, handlePrestart);
    socket.on(MatchSocketEvent.START, handleStart);
    socket.on(MatchSocketEvent.ABORT, handleAbort);
    socket.on(MatchSocketEvent.END, handleEnd);
    socket.on(MatchSocketEvent.COMMIT, handleCommit);
    socket.on(MatchSocketEvent.UPDATE, handleUpdate);
    socket.on('fcs:status', handleFcsStatus);
    socket.connect();
    socket.emit('rooms', ['match', 'fcs']);
    setSocket(socket);
    return () => {
      socket.off(MatchSocketEvent.PRESTART, handlePrestart);
      socket.off(MatchSocketEvent.START, handleStart);
      socket.off(MatchSocketEvent.ABORT, handleAbort);
      socket.off(MatchSocketEvent.END, handleEnd);
      socket.off(MatchSocketEvent.COMMIT, handleCommit);
      socket.off(MatchSocketEvent.UPDATE, handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentMatch) {
      setMatch(currentMatch);
    }
  }, [currentMatch]);

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
  const handleUpdate = (update: Match<any>) => {
    const newMatch = JSON.parse(JSON.stringify(update));
    if (status === 'STANDBY') {
      setStatus('IN PROGRESS');
    }
    setMatch(newMatch);
  };

  const handleFcsStatus = (status: FieldControlStatus) => {
    setFcsStatus(status);
  };
  const handleFcsClearStatus = () => {
    socket?.emit('fcs:clearStatus');
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  const createSocket = (autoConnect: boolean = false, token: string = '') => {
    return io(socketUrl, {
      rejectUnauthorized: false,
      transports: ['websocket'],
      query: { token },
      autoConnect
    });
  };

  const getMatchStatus = (): string => {
    return connected
      ? match
        ? `${match?.name} - ${status}`
        : status
      : 'OFFLINE';
  };

  const getCardColor = (): string => {
    if (!fcsStatus) return '#ffffff';

    if (Object.entries(fcsStatus.wleds).some((wled) => !wled[1].connected)) {
      return '#FAA0A0';
    } else if (
      Object.entries(fcsStatus.wleds).some(
        (wled) => wled[1].stickyLostConnection
      )
    ) {
      return '#FFFF8F';
    } else {
      return '#FFFFFF';
    }
  };

  const getFieldDelay = (): string => {
    const now = DateTime.now().set({ second: 0, millisecond: 0 });
    if (match) {
      const scheduled = DateTime.fromISO(match.scheduledTime).set({
        second: 0,
        millisecond: 0
      });
      if (now > scheduled) {
        return now.diff(scheduled).toFormat(`h'h' m'm' 'behind'`);
      } else if (now < scheduled) {
        return scheduled.diff(now).toFormat(`h'h' m'm' 'ahead'`);
      } else {
        return 'On Time';
      }
    } else {
      return 'N/A';
    }
  };

  return (
    <>
      <Card
        onClick={() => {
          setDialogOpen(true);
        }}
        style={{ cursor: 'pointer', backgroundColor: getCardColor() }}
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
          <MenuItem onClick={handleClose}>Refresh</MenuItem>
        </Menu>
        <CardHeader
          title={`Field ${field}`}
          subheader={getMatchStatus()}
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
          <MatchDetails key={field} match={match} teams={teams} />
        </CardContent>
        <CardActions>
          <Typography
            variant='body2'
            sx={{ marginLeft: 'auto' }}
            color={getFieldDelay().includes('behind') ? 'error' : 'primary'}
          >
            {getFieldDelay()}
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
        <DialogTitle display={'flex'} justifyContent={'space-between'}>
          {`Field ${field}`}
          <Stack direction={'row'} spacing={2}>
            <Button onClick={handleFcsClearStatus}>Clear Status</Button>
            <Button
              color={'info'}
              endIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} columns={12}>
            <Grid item xs={12}>
              <Stack direction={'row'} spacing={2}>
                {connected ? (
                  <CheckCircleIcon color='success' />
                ) : (
                  <ErrorIcon color='error' />
                )}
                <Typography>{getMatchStatus()}</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <MatchDetails key={field} match={match} teams={teams} expanded />
            </Grid>
            {fcsStatus
              ? Object.entries(fcsStatus.wleds).map((wled) => (
                  <Grid item key={wled[0]}>
                    <Stack direction={'row'} spacing={1}>
                      {wled[1].connected ? (
                        !wled[1].stickyLostConnection ? (
                          <CheckCircleIcon color={'success'} />
                        ) : (
                          <WarningIcon color={'warning'} />
                        )
                      ) : (
                        <ErrorIcon color='error' />
                      )}
                      <Typography>{`${wled[0]} wled`}</Typography>
                    </Stack>
                  </Grid>
                ))
              : null}
            <Grid item xs={12}>
              <Button variant={'contained'} href={`${webUrl}`} fullWidth>
                Open
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant={'contained'}
                color={'error'}
                href={`${webUrl}/${match?.eventKey}/referee/red`}
                disabled={match === undefined}
                fullWidth
              >
                Red Referee
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant={'contained'}
                href={`${webUrl}/${match?.eventKey}/referee/head`}
                disabled={match === undefined}
                fullWidth
              >
                Head Referee
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant={'contained'}
                color={'info'}
                href={`${webUrl}/${match?.eventKey}/referee/blue`}
                disabled={match === undefined}
                fullWidth
              >
                Blue Referee
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface MatchDetailsProps {
  match: Match<any> | null;
  teams: Team[] | undefined;
  expanded?: boolean;
}

const MatchDetails: FC<MatchDetailsProps> = ({ match, teams, expanded }) => {
  const participants = match?.participants?.map((p) => ({
    ...p,
    team: teams?.find((t) => t.teamKey === p.teamKey)
  }));
  return (
    <Grid container>
      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${participants?.[0].team?.countryCode}`}
              />{' '}
              {expanded
                ? participants?.[0].team?.teamNameShort
                : participants?.[0].team?.country}
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>
      <Grid item xs={4} />
      <Grid item xs={4}>
        <Typography align='right' className='blue'>
          {participants ? (
            <>
              {expanded
                ? participants?.[3].team?.teamNameShort
                : participants?.[3].team?.country}{' '}
              <span
                className={`flag-icon flag-icon-${participants?.[3].team?.countryCode}`}
              />
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${participants?.[1].team?.countryCode}`}
              />{' '}
              {expanded
                ? participants?.[1].team?.teamNameShort
                : participants?.[1].team?.country}
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
          {participants ? (
            <>
              {expanded
                ? participants?.[4].team?.teamNameShort
                : participants?.[4].team?.country}{' '}
              <span
                className={`flag-icon flag-icon-${participants?.[4].team?.countryCode}`}
              />
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <Typography align='left' className='red'>
          {participants ? (
            <>
              <span
                className={`flag-icon flag-icon-${participants?.[2].team?.countryCode}`}
              />{' '}
              {expanded
                ? participants?.[2].team?.teamNameShort
                : participants?.[2].team?.country}
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Grid>
      <Grid item xs={4} />
      <Grid item xs={4}>
        <Typography align='right' className='blue'>
          {participants ? (
            <>
              {expanded
                ? participants?.[5].team?.teamNameShort
                : participants?.[5].team?.country}{' '}
              <span
                className={`flag-icon flag-icon-${participants[5].team?.countryCode}`}
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
  const { data: teams } = useTeamsForEvent('FGC_2024-FGC-CMP');
  return (
    <DefaultLayout title='Event Monitor'>
      <Grid container spacing={3} columns={10}>
        <Grid item md={2} xs={10}>
          <MonitorCard
            field={5}
            address='192.168.80.151'
            realtimePort={8081}
            teams={teams}
          />
        </Grid>
        <Grid item md={2} xs={10}>
          <MonitorCard
            field={4}
            address='192.168.80.141'
            realtimePort={8081}
            teams={teams}
          />
        </Grid>
        <Grid item md={2} xs={10}>
          <MonitorCard
            field={3}
            address='192.168.80.131'
            realtimePort={8081}
            teams={teams}
          />
        </Grid>
        <Grid item md={2} xs={10}>
          <MonitorCard
            field={2}
            address='192.168.80.121'
            realtimePort={8081}
            teams={teams}
          />
        </Grid>
        <Grid item md={2} xs={10}>
          <MonitorCard
            field={1}
            address='192.168.80.111'
            realtimePort={8081}
            teams={teams}
          />
        </Grid>
      </Grid>
    </DefaultLayout>
  );
};
