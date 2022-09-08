import { useEffect } from 'react';
import {
  setApiStorage,
  setApiStorageKey,
  useApiStorage
} from 'src/api/ApiProvider';

export interface AppFlags {
  createdEvent: boolean;
  createdAccounts: boolean;
}

const defaultFlags: AppFlags = {
  createdEvent: false,
  createdAccounts: false
};

export function useFlags(): [AppFlags] {
  const { data, error } = useApiStorage<AppFlags>('flags.json');

  useEffect(() => {
    if (error) initFlags();
  }, [error]);

  const initFlags = async (): Promise<void> =>
    setApiStorage('flags.json', defaultFlags);

  return data ? [data] : [defaultFlags];
}

export async function setFlag(
  flag: keyof AppFlags,
  value: boolean
): Promise<void> {
  await setApiStorageKey('flags.json', flag, value);
  return;
}
