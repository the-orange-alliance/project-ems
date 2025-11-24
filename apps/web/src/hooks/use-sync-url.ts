import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  eventKeyAtom,
  teamKeyAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';

export const useSyncUrlToState = () => {
  const { eventKey, teamKey, tournamentKey } = useParams();
  const setEventKey = useSetAtom(eventKeyAtom);
  const setTeamKey = useSetAtom(teamKeyAtom);
  const setTournamentKey = useSetAtom(tournamentKeyAtom);
  useEffect(() => {
    if (eventKey) {
      setEventKey(eventKey);
    }
    if (teamKey) {
      setTeamKey(teamKey);
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
