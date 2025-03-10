import { z } from 'zod';
import { matchKeyZod } from '../base/Match.js';

export enum PrestartState {
  NotReady,
  Prestarting,
  Success,
  Fail
}

export const prestartStatusZod = z.object({
  state: z.nativeEnum(PrestartState),
  hardware: z.array(
    z.object({
      name: z.string(),
      state: z.nativeEnum(PrestartState),
      lastLog: z.string()
    })
  ),
  matchKey: matchKeyZod
});

// export interface PrestartStatus {
//   state: PrestartState;
//   hardware: HardwareInfo[];
//   matchKey: MatchKey;
// }

export type AvaliableHardware =
  | 'PLC'
  | 'Driverstation'
  | 'Access Point'
  | 'Field Switch'
  | string;
export interface HardwareInfo {
  name: AvaliableHardware;
  state: PrestartState;
  lastLog: string;
}

export type PrestartStatus = z.infer<typeof prestartStatusZod>;
