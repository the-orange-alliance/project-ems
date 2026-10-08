import { Badge, Tooltip } from 'antd';
import { FC } from 'react';
import {
  FcsConnectionStatus,
  FcsFieldClient,
  getOfflineDevices
} from '@toa-lib/models';

const fieldName = (client: FcsFieldClient) =>
  client.field !== null ? `Field ${client.field}` : 'Field';

/**
 * Shows whether field hardware is reporting to EMS, and flags any of its
 * devices (e.g. WLEDs) that are offline. Hover for per-device details.
 * `minimal` keeps the color but shortens the label to just "Field".
 */
export const FieldConnectionBadge: FC<{
  /** null when the realtime server doesn't report fields; renders nothing */
  status: FcsConnectionStatus | null;
  minimal?: boolean;
}> = ({ status, minimal }) => {
  if (!status) return null;
  const { connected, fields } = status;
  if (!connected) {
    return minimal ? (
      <Tooltip title='Field Not Connected'>
        <Badge status='error' text='Field' />
      </Tooltip>
    ) : (
      <Badge status='error' text='Field Not Connected' />
    );
  }

  const degraded = fields.filter((f) => getOfflineDevices(f).length > 0);
  const text = degraded.length
    ? degraded
        .map(
          (f) => `${fieldName(f)}: ${getOfflineDevices(f).join(', ')} Offline`
        )
        .join(' · ')
    : `${fields.map(fieldName).join(', ')} Connected`;
  const details = fields.flatMap((f) => {
    const devices = Object.entries(f.devices);
    return devices.length
      ? devices.map(
          ([name, ok]) =>
            `${fieldName(f)} ${name}: ${ok ? 'Connected' : 'Not Connected'}`
        )
      : [`${fieldName(f)}: Connected`];
  });

  return (
    <Tooltip
      title={details.map((line) => (
        <div key={line}>{line}</div>
      ))}
    >
      <Badge
        status={degraded.length ? 'warning' : 'success'}
        text={minimal ? 'Field' : text}
      />
    </Tooltip>
  );
};
