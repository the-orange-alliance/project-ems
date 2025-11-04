import {
  Button,
  Card,
  Col,
  Dropdown,
  Flex,
  Input,
  Modal,
  Row,
  Space,
  Typography,
  Grid,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useMatchAll } from '../../api/use-match-data.js';
import { DateTime } from 'luxon';
import { FC, useEffect, useState } from 'react';
import { DefaultLayout } from '../../layouts/default-layout.js';
import {
  MatchSocketEvent,
  MatchKey,
  Match,
  FieldControlStatus,
  Team,
  Displays,
  FGC25FCS
} from '@toa-lib/models';
import { io, Socket } from 'socket.io-client';
import { useEventState } from '../../stores/hooks/use-event-state.js';
import { useAtomValue } from 'jotai';
import { darkModeAtom } from '../../stores/state/ui.js';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface Monitor {
  field: number;
  address: string;
  realtimePort: number;
}

interface MonitorCardProps {
  field: number;
  address: string;
  realtimePort: number;
  teams?: Team[];
  onRemove?: () => void;
}

const MonitorCard: FC<MonitorCardProps> = ({
  field,
  address,
  realtimePort,
  teams,
  onRemove
}) => {
  const webUrl = `http://${address}`;
  const socketUrl = `ws://${address}:${realtimePort}`;
  const darkMode = useAtomValue(darkModeAtom);

  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState<MatchKey | null>(null);
  const [status, setStatus] = useState('STANDBY');
  const { data: currentMatch } = useMatchAll(key);
  const [socket, setSocket] = useState<null | Socket>(null);
  const [match, setMatch] = useState<Match<any> | null>(null);
  const [currentDisplay, setCurrentDisplay] = useState<Displays>(
    Displays.BLANK
  );
  const [fcsStatus, setFcsStatus] = useState<FGC25FCS.FcsStatus | null>(null);
  const seasonComponents = useSeasonComponents();

  const handleRefresh = () => {
    console.log('Refresh but idk how to');
  };

  useEffect(() => {
    const socket = createSocket();
    worker.on('connect', handleConnect);
    worker.on('disconnect', handleDisconnect);
    worker.on(MatchSocketEvent.PRESTART, handlePrestart);
    worker.on(MatchSocketEvent.START, handleStart);
    worker.on(MatchSocketEvent.ABORT, handleAbort);
    worker.on(MatchSocketEvent.END, handleEnd);
    worker.on(MatchSocketEvent.COMMIT, handleCommit);
    worker.on(MatchSocketEvent.UPDATE, handleUpdate);
    worker.on(MatchSocketEvent.DISPLAY, handleDisplay);
    worker.on('fcs:status', handleFcsStatus);
    socket.connect();
    socket.emit('rooms', ['match', 'fcs']);
    setSocket(socket);
    return () => {
      worker.off(MatchSocketEvent.PRESTART, handlePrestart);
      worker.off(MatchSocketEvent.START, handleStart);
      worker.off(MatchSocketEvent.ABORT, handleAbort);
      worker.off(MatchSocketEvent.END, handleEnd);
      worker.off(MatchSocketEvent.COMMIT, handleCommit);
      worker.off(MatchSocketEvent.UPDATE, handleUpdate);
      worker.off(MatchSocketEvent.DISPLAY, handleDisplay);
    };
  }, []);

  useEffect(() => {
    if (currentMatch) {
      setMatch(currentMatch);
    }
  }, [currentMatch]);

  const handleConnect = () => setConnected(true);
  const handleDisconnect = () => setConnected(false);

  const handleDisplay = (display: Displays) => {
    setCurrentDisplay(display);
  };

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

  const handleFcsClearStatus = () => {
    worker?.emit('fcs:clearStatus');
  };

  const handleFcsStatus = (status: any) => {
    const parsedStatus: FGC25FCS.FcsStatus = JSON.parse(status as string); // lol?
    setFcsStatus(parsedStatus);
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
    return darkMode ? '#1f1f1f' : '#ffffff';
  };

  const currentDisplayName =
    currentDisplay === Displays.BLANK
      ? 'Blank'
      : currentDisplay === Displays.MATCH_PREVIEW
        ? 'Match Preview'
        : currentDisplay === Displays.MATCH_RESULTS
          ? 'Match Results'
          : currentDisplay === Displays.SPONSOR
            ? 'Sponsor'
            : currentDisplay === Displays.MATCH_START
              ? 'In-Match'
              : currentDisplay === Displays.RANKINGS
                ? 'Rankings'
                : 'Unknown';

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

  const menuItems = [
    {
      key: 'refresh',
      label: 'Refresh',
      icon: <ReloadOutlined />,
      onClick: handleRefresh
    },
    ...(onRemove
      ? [
          {
            key: 'remove',
            label: 'Remove Monitor',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: onRemove
          }
        ]
      : [])
  ];

  return (
    <>
      <Card
        onClick={() => {
          setDialogOpen(true);
        }}
        style={{ cursor: 'pointer', backgroundColor: getCardColor(), flex: 1 }}
        title={
          <Space>
            {connected ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            <Text strong>{`Field ${field}`}</Text>
          </Space>
        }
        extra={
          <Dropdown
            menu={{ items: menuItems }}
            placement='bottomRight'
            trigger={['click']}
          >
            <Button
              type='text'
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{
                color: 'inherit'
              }}
            />
          </Dropdown>
        }
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Space
            direction='horizontal'
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <Text>{getMatchStatus()}</Text>
            <Text>
              <i>{currentDisplayName}</i>
            </Text>
          </Space>
          <MatchDetails key={field} match={match} teams={teams} />
          <Flex justify='flex-end'>
            <Text
              type={getFieldDelay().includes('behind') ? 'danger' : undefined}
            >
              {getFieldDelay()}
            </Text>
          </Flex>
          <Flex>
            {fcsStatus &&
            seasonComponents &&
            seasonComponents.FieldMonitorExtraMinimal ? (
              <seasonComponents.FieldMonitorExtraMinimal {...fcsStatus} />
            ) : null}
          </Flex>
        </Space>
      </Card>
      <Modal
        title={
          <Flex justify='space-between' align='center'>
            <Text strong>{`Field ${field}`}</Text>
            <Space>
              <Button onClick={handleFcsClearStatus}>Clear Status</Button>
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Space>
          </Flex>
        }
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={null}
        width={800}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Space>
            {connected ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            <Text>{getMatchStatus()}</Text>
          </Space>

          <MatchDetails key={field} match={match} teams={teams} expanded />

          <Flex>
            {fcsStatus &&
            seasonComponents &&
            seasonComponents.FieldMonitorExtra ? (
              <seasonComponents.FieldMonitorExtra {...fcsStatus} />
            ) : null}
          </Flex>

          <Divider>Field Control</Divider>
          <Flex vertical gap='0.25rem'>
            <Flex gap='0.25rem'>
              <Button
                type='primary'
                block
                onClick={() => worker?.emit('fcs:allClear')}
              >
                Force Field Green
              </Button>
              <Button
                type='primary'
                block
                onClick={() => worker?.emit('fcs:prepareField')}
              >
                Force Prep Field
              </Button>
            </Flex>
            <Flex gap='0.25rem'>
              <Button
                type='primary'
                block
                onClick={() => worker?.emit('fcs:awardsMode')}
              >
                Awards Mode
              </Button>
              <Button
                type='primary'
                block
                onClick={() => worker?.emit('fcs:ropeDrop')}
              >
                Force Rope Drop (2025)
              </Button>
            </Flex>
          </Flex>

          <Divider />
          <Space direction='vertical' style={{ width: '100%' }}>
            <Button type='primary' href={`${webUrl}`} target='_blank' block>
              Open
            </Button>

            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Button
                  danger
                  href={`${webUrl}/${match?.eventKey}/referee/red`}
                  disabled={match === undefined}
                  target='_blank'
                  block
                >
                  Red Referee
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  type='primary'
                  href={`${webUrl}/${match?.eventKey}/referee/head`}
                  disabled={match === undefined}
                  target='_blank'
                  block
                >
                  Head Referee
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  href={`${webUrl}/${match?.eventKey}/referee/blue`}
                  disabled={match === undefined}
                  target='_blank'
                  block
                  style={{
                    backgroundColor: '#1890ff',
                    borderColor: '#1890ff',
                    color: 'white'
                  }}
                >
                  Blue Referee
                </Button>
              </Col>
            </Row>
          </Space>
        </Space>
      </Modal>
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
    <Row gutter={[8, 8]}>
      <Col span={8}>
        <Text className='red' style={{ color: '#ff4d4f' }}>
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
        </Text>
      </Col>
      <Col span={8} />
      <Col span={8} style={{ textAlign: 'right' }}>
        <Text className='blue' style={{ color: '#1890ff' }}>
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
        </Text>
      </Col>

      <Col span={8}>
        <Text className='red' style={{ color: '#ff4d4f' }}>
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
        </Text>
      </Col>
      <Col span={8} style={{ textAlign: 'center' }}>
        <Text>vs.</Text>
      </Col>
      <Col span={8} style={{ textAlign: 'right' }}>
        <Text className='blue' style={{ color: '#1890ff' }}>
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
        </Text>
      </Col>

      <Col span={8}>
        <Text className='red' style={{ color: '#ff4d4f' }}>
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
        </Text>
      </Col>
      <Col span={8} />
      <Col span={8} style={{ textAlign: 'right' }}>
        <Text className='blue' style={{ color: '#1890ff' }}>
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
        </Text>
      </Col>

      <Col span={8} style={{ textAlign: 'center' }}>
        <Text
          strong
          className='red'
          style={{ color: '#ff4d4f', fontSize: '16px' }}
        >
          {match ? match.redScore : '--'}
        </Text>
      </Col>
      <Col span={8} />
      <Col span={8} style={{ textAlign: 'center' }}>
        <Text
          strong
          className='blue'
          style={{ color: '#1890ff', fontSize: '16px' }}
        >
          {match ? match.blueScore : '--'}
        </Text>
      </Col>
    </Row>
  );
};

export const EventMonitor: FC = () => {
  const { state } = useEventState({ teams: true });
  const { teams } = state.remote;

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [inputValue, setInputValue] = useState('');
  const screens = useBreakpoint();

  // Load monitors from localStorage on component mount
  useEffect(() => {
    const savedMonitors = localStorage.getItem('event-monitors');
    const queryParamMonitors = new URLSearchParams(window.location.search).get(
      'ips'
    );
    if (
      queryParamMonitors &&
      queryParamMonitors !== null &&
      typeof queryParamMonitors === 'string'
    ) {
      const monitors = queryParamMonitors.split(',').map((address, index) => ({
        field: index + 1,
        address: address.trim(),
        realtimePort: 8081
      }));
      setMonitors(monitors);
    } else if (savedMonitors) {
      try {
        const parsedMonitors = JSON.parse(savedMonitors);
        setMonitors(parsedMonitors);
      } catch (error) {
        console.error('Error parsing monitors from localStorage:', error);
        // Initialize with default monitors if parsing fails
        initializeDefaultMonitors();
      }
    } else {
      // Initialize with default monitors if none exist
      initializeDefaultMonitors();
    }
  }, []);

  const initializeDefaultMonitors = () => {
    const defaultMonitors: Monitor[] = [
      { field: 5, address: '192.168.80.151', realtimePort: 8081 },
      { field: 4, address: '192.168.80.141', realtimePort: 8081 },
      { field: 3, address: '192.168.80.131', realtimePort: 8081 },
      { field: 2, address: '192.168.80.121', realtimePort: 8081 },
      { field: 1, address: '192.168.80.111', realtimePort: 8081 }
    ];
    setMonitors(defaultMonitors);
    localStorage.setItem('event-monitors', JSON.stringify(defaultMonitors));
  };

  // Save monitors to localStorage whenever monitors array changes
  useEffect(() => {
    if (monitors.length > 0) {
      localStorage.setItem('event-monitors', JSON.stringify(monitors));
    }
  }, [monitors]);

  const handleAddMonitor = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Generate next field number
    const nextField =
      monitors.length > 0 ? Math.max(...monitors.map((m) => m.field)) + 1 : 1;

    const newMonitor: Monitor = {
      field: nextField,
      address: trimmedValue,
      realtimePort: 8081 // Default port
    };

    setMonitors((prev) => [...prev, newMonitor]);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMonitor();
    }
  };

  const handleRemoveMonitor = (address: string, field: number) => {
    setMonitors((prev) =>
      prev.filter(
        (monitor) => !(monitor.address === address && monitor.field === field)
      )
    );
  };

  return (
    <DefaultLayout title='Event Monitor'>
      <Space direction='vertical' style={{ width: '100%', marginBottom: 24 }}>
        <Card title='Add Monitor' size='small'>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder='Enter IP address (e.g., 192.168.80.111)'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleAddMonitor}
            >
              Add
            </Button>
          </Space.Compact>
        </Card>

        <Text type='secondary'>
          Current monitors: {monitors.map((m) => m.address).join(', ')}
        </Text>
      </Space>

      <Flex wrap>
        {monitors.map((monitor) => (
          <Flex
            key={`${monitor.address}-${monitor.field}`}
            style={{ width: screens.md ? '20%' : '50%', padding: '0.25rem' }}
          >
            <MonitorCard
              field={monitor.field}
              address={monitor.address}
              realtimePort={monitor.realtimePort}
              teams={teams}
              onRemove={() =>
                handleRemoveMonitor(monitor.address, monitor.field)
              }
            />
          </Flex>
        ))}
      </Flex>
    </DefaultLayout>
  );
};
