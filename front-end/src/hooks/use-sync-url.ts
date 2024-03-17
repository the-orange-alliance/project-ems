import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';

export const useSyncUrlToRecoil = () => {
  const { eventKey } = useParams();
  const setEventKey = useSetRecoilState(currentEventKeyAtom);
  useEffect(() => {
    if (eventKey) {
      setEventKey(eventKey);
    }
  }, [eventKey, setEventKey]);
};
