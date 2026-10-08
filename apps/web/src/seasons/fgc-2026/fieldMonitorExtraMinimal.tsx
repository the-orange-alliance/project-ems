import { FGC26FCS } from '@toa-lib/models';
import { FC } from 'react';
import { StatusTag } from '../fgc-2025/fieldMonitorExtra.js';
import { getWledStatus, isWledReported } from './fieldMonitorExtra.js';

export const FieldMonitorExtraMinimal: FC<FGC26FCS.FcsStatus> = ({ wled }) => {
  return isWledReported(wled) ? (
    <StatusTag
      status={getWledStatus(wled.goalConnected, wled.goalStickyDisconnect)}
      label='Goal LEDs'
    />
  ) : null;
};
