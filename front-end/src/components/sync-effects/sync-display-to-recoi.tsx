import { MatchSocketEvent } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { displayIdAtom } from 'src/stores/NewRecoil';

export const SyncDisplayToRecoil: FC = () => {
  const setDisplay = useSetRecoilState(displayIdAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.DISPLAY, setDisplay);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.DISPLAY, setDisplay);
    };
  }, []);

  return null;
};
