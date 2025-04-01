import { DependencyList, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { appbarConfigAtom } from 'src/stores/state/ui.js';

export const useUpdateAppbar = (
  config: {
    title?: string;
    titleLink?: string;
    showSettings?: boolean;
    showFullscreen?: boolean;
  },
  deps: DependencyList
) => {
  const updateAppbar = useSetAtom(appbarConfigAtom);
  useEffect(() => {
    updateAppbar(config);
  }, [deps]);
};
