import { FC, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import useSWR from 'swr';
import {
  Alert,
  AutoComplete,
  Descriptions,
  Flex,
  QRCode,
  Typography
} from 'antd';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useParams } from 'react-router-dom';
import { TeamKeysLables } from '@toa-lib/models';
import {
  followerHostAtom,
  isFollowerAtom,
  teamIdentifierAtom
} from 'src/stores/state/ui.js';
import {
  buildConfiguratorUrl,
  RemoteConfigKey
} from './remote-config-params.js';

interface NetworkAddress {
  name: string;
  address: string;
}

// Always ask the API running on *this* machine, never `localClient` - in
// follower mode that points at the leader, whose IPs are the wrong ones.
const localApiBase = `${window.location.protocol}//${window.location.hostname}:8080`;

const fetchAddresses = async (): Promise<NetworkAddress[]> => {
  const res = await fetch(`${localApiBase}/network`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const body = (await res.json()) as { addresses: NetworkAddress[] };
  return body.addresses;
};

const isLoopback = (host: string) =>
  ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host.trim());

export const RemoteSetup: FC = () => {
  // The route is always /:eventKey/remote-setup, so read the key from the URL
  // rather than waiting on the event fetch.
  const { eventKey } = useParams();
  const isFollower = useAtomValue(isFollowerAtom);
  const followerHost = useAtomValue(followerHostAtom);
  const teamIdentifier = useAtomValue(teamIdentifierAtom);
  const leaderApiHost = isFollower ? followerHost.trim() : '';

  const { data: addresses, error } = useSWR('local-network', fetchAddresses);
  const [host, setHost] = useState('');

  // Pre-select once the address list settles: keep the current hostname if
  // it's already a LAN address, otherwise take the first one found. If the
  // lookup failed, fall back to the current hostname so a QR still renders.
  useEffect(() => {
    if (host || (!addresses && !error)) return;
    const current = window.location.hostname;
    const match = addresses?.find((a) => a.address === current);
    setHost(match?.address ?? addresses?.[0]?.address ?? current);
  }, [addresses, error, host]);

  const url = useMemo(() => {
    if (!eventKey || !host.trim()) return '';
    // Read from the atoms rather than raw localStorage so settings still at
    // their default (never written to storage) are forwarded too. Every key
    // is always sent, so scanning also resets stale values on a re-used tablet.
    const config: Record<RemoteConfigKey, string> = {
      leaderApiEnabled: String(Boolean(leaderApiHost)),
      leaderApiHost,
      teamIdentifier
    };
    return buildConfiguratorUrl({ host: host.trim(), eventKey, config });
  }, [eventKey, host, leaderApiHost, teamIdentifier]);

  return (
    <PaperLayout header='Remote Client Setup' containerWidth={720}>
      <Flex vertical gap={16} align='center'>
        <Typography.Paragraph style={{ textAlign: 'center', margin: 0 }}>
          Scan this code with a ref tablet to point it at this field&apos;s
          EMS.
        </Typography.Paragraph>
        <AutoComplete
          style={{ width: '100%', maxWidth: 400 }}
          value={host}
          onChange={setHost}
          placeholder='This laptop’s LAN address'
          options={(addresses ?? []).map((a) => ({
            value: a.address,
            label: `${a.name} — ${a.address}`
          }))}
        />
        {error && (
          <Alert
            type='warning'
            showIcon
            message='Could not list this laptop’s network addresses. Enter its LAN IP manually.'
          />
        )}
        {isLoopback(host) && (
          <Alert
            type='warning'
            showIcon
            message={`"${host}" is only reachable from this laptop. Choose its LAN IP instead.`}
          />
        )}
        {url ? (
          // Pin both colors: the default foreground is the theme text color,
          // which is near-white in dark mode and vanishes on a white tile.
          <QRCode
            value={url}
            size={320}
            errorLevel='M'
            color='#000'
            bgColor='#fff'
          />
        ) : (
          <QRCode value='' size={320} status='loading' />
        )}
        {url && (
          <Typography.Text copyable code style={{ wordBreak: 'break-all' }}>
            {url}
          </Typography.Text>
        )}
        <Descriptions
          bordered
          size='small'
          column={1}
          style={{ width: '100%' }}
          items={[
            {
              key: 'socket',
              label: 'Socket server',
              children: host ? `${host.trim()}:8081` : '—'
            },
            {
              key: 'api',
              label: 'API server',
              children: leaderApiHost || 'This laptop'
            },
            {
              key: 'teamIdentifier',
              label: 'Team identifier',
              children: TeamKeysLables[teamIdentifier] ?? teamIdentifier
            }
          ]}
        />
      </Flex>
    </PaperLayout>
  );
};
