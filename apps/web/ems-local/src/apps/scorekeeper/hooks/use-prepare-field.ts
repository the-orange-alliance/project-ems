import { useMatchControl } from './use-match-control.js';
import { MatchState } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { isSocketConnectedAtom } from 'src/stores/state/ui.js';

export const usePrepareFieldCallback = () => {
  const { canPrepField, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useAtomCallback(
    useCallback(
      (get) => {
        const socketConnected = get(isSocketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPrepField) {
          throw new Error('Attempted to prepare field when not allowed.');
        }
        fieldControl?.prepareField?.();
        setState(MatchState.FIELD_READY);
      },
      [canPrepField, setState]
    )
  );
};
