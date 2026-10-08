import { FGC26FCS } from '@toa-lib/models';
import { Tooltip } from 'antd';
import { FC } from 'react';
import { FieldStatusRow } from 'src/components/util/field-status-row.js';
import { StatusTag, StatusType } from '../fgc-2025/fieldMonitorExtra.js';

/**
 * Red: not connected now. Yellow: dropped at some point since the last
 * Clear Status. Green: connected the whole time.
 */
export const getWledStatus = (
  connected?: boolean,
  stickyDisconnect?: boolean
): StatusType =>
  !connected ? 'error' : stickyDisconnect ? 'warning' : 'success';

const WLED_STATUS_LABELS: Record<StatusType, string> = {
  success: 'OK',
  warning: 'Dropped',
  error: 'Offline'
};

const WLED_STATUS_HINTS: Record<StatusType, string> = {
  success: 'Connected since the last Clear Status',
  warning: 'Reconnected, but dropped since the last Clear Status',
  error: 'Not connected'
};

/** False for fields that send no WLED state, or another season's format */
export const isWledReported = (
  wled?: Partial<FGC26FCS.WledFcsStatus>
): wled is FGC26FCS.WledFcsStatus => typeof wled?.goalConnected === 'boolean';

/** The Goal LEDs row, shared by the dashboard card and the detail view. */
export const FieldMonitorExtra: FC<FGC26FCS.FcsStatus> = ({ wled }) => {
  if (!isWledReported(wled)) return null;
  const status = getWledStatus(wled.goalConnected, wled.goalStickyDisconnect);
  return (
    <FieldStatusRow label='Goal LEDs'>
      <Tooltip title={WLED_STATUS_HINTS[status]}>
        <span>
          <StatusTag status={status} label={WLED_STATUS_LABELS[status]} />
        </span>
      </Tooltip>
    </FieldStatusRow>
  );
};
