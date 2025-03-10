import { useRecoilState } from 'recoil';
import { setApiStorage, setApiStorageKey } from 'src/api/use-storage-data';
import { appFlagsAtom } from './NewRecoil';

export interface AppFlags {
  createdEvents: string[];
  createdTeams: string[];
  createdTournaments: string[];
  createdAccounts: boolean;
  createdSchedules: string[];
}

export const defaultFlags: AppFlags = {
  createdEvents: [],
  createdTeams: [],
  createdTournaments: [],
  createdAccounts: false,
  createdSchedules: []
};

export function useFlags(): [
  AppFlags,
  (flag: keyof AppFlags, value: unknown) => Promise<void>,
  () => Promise<void>
] {
  const [appFlags, setAppFlags] = useRecoilState(appFlagsAtom);

  const setterOrUpdater = async (
    flag: keyof AppFlags,
    value: unknown
  ): Promise<void> => {
    setAppFlags({ ...appFlags, [flag]: value });
    await setFlag(flag, value);
  };

  const purge = async (): Promise<void> => {
    setAppFlags(defaultFlags);
    await purgeFlags();
  };

  return [appFlags, setterOrUpdater, purge];
}

async function setFlag(flag: keyof AppFlags, value: unknown): Promise<void> {
  await setApiStorageKey('flags.json', flag, value);
  return;
}

async function purgeFlags(): Promise<void> {
  await setApiStorage('flags.json', {});
  return;
}
