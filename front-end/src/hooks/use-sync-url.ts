import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import {
  currentEventKeyAtom,
  currentTeamKeyAtom,
  currentTournamentKeyAtom
} from 'src/stores/NewRecoil';

export const useSyncUrlToRecoil = () => {
  const { eventKey, teamKey, tournamentKey } = useParams();
  const setEventKey = useSetRecoilState(currentEventKeyAtom);
  const setTeamKey = useSetRecoilState(currentTeamKeyAtom);
  const setTournamentKey = useSetRecoilState(currentTournamentKeyAtom);
  useEffect(() => {
    if (eventKey) {
      setEventKey(eventKey);
    }
    if (teamKey) {
      setTeamKey(parseInt(teamKey));
    }
    if (tournamentKey) {
      setTournamentKey(tournamentKey);
    }
  }, [
    eventKey,
    teamKey,
    tournamentKey,
    setEventKey,
    setTeamKey,
    setTournamentKey
  ]);
};
