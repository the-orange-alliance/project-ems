import { FGC26FCS } from '@toa-lib/models';
import { FC } from 'react';
import { FieldMonitorExtra } from './fieldMonitorExtra.js';

// Only one device so far, so the card shows the same row as the detail view
export const FieldMonitorExtraMinimal: FC<FGC26FCS.FcsStatus> = (status) => (
  <FieldMonitorExtra {...status} />
);
