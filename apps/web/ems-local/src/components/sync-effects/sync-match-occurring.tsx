import { Match, MatchSocketEvent, MatchState } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { FC, useEffect } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { matchAtom } from 'src/stores/state/event.js';
import { matchStateAtom } from 'src/stores/state/match.js';

interface Props {
  stopAfterMatchEnd?: boolean;
}

export const SyncMatchOccurring: FC<Props> = ({
  stopAfterMatchEnd
}) => {
  const [socket, connected] = useSocket();
  const fieldControl = useSeasonFieldControl();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.UPDATE, onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.UPDATE, onUpdate);
    };
  }, []);

  const onUpdate = useAtomCallback(
    (get, set) =>
      async (newMatch: Match<any>) => {
        const state = await get(matchStateAtom);
        if (stopAfterMatchEnd && state >= MatchState.MATCH_COMPLETE) {
          // Don't update anything.
          return;
        } else {
          set(matchAtom, newMatch);
          fieldControl?.onMatchUpdate?.(newMatch);
        }
      }
  );

  return null;
};
