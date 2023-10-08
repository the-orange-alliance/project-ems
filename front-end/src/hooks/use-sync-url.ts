import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';

export const useSyncUrlToRecoil = () => {
  const setEventKey = useSetRecoilState(currentEventKeyAtom);

  useEffect(() => {
    if (window.location.pathname.split('/').length > 1) {
      setEventKey(window.location.pathname.split('/')[1]);
    }
  }, []);
};
