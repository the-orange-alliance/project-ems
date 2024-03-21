import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { currentEventKeyAtom, currentTeamKeyAtom } from 'src/stores/NewRecoil';

export const useSyncUrlToRecoil = () => {
  const { eventKey, teamKey } = useParams();
  const setEventKey = useSetRecoilState(currentEventKeyAtom);
  const setTeamKey = useSetRecoilState(currentTeamKeyAtom);
  useEffect(() => {
    if (eventKey) {
      setEventKey(eventKey);
    }
    if (teamKey) {
      setTeamKey(parseInt(teamKey));
    }
  }, [eventKey, teamKey, setEventKey, setTeamKey]);
};
