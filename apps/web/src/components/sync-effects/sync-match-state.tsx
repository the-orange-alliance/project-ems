import { MatchKey, MatchSocketEvent, MatchState } from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { FC, useEffect } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import {
  eventKeyAtom,
  matchIdAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import { matchStateAtom, matchStatusAtom } from 'src/stores/state/match.js';

export const SyncMatchState: FC = () => {
  const setState = useSetAtom(matchStateAtom);
  const setMode = useSetAtom(matchStatusAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.PRESTART, onMatchPrestart);
      socket?.on(MatchSocketEvent.START, onMatchStart);
      socket?.on(MatchSocketEvent.END, onMatchEnd);
      socket?.on(MatchSocketEvent.ABORT, onMatchAbort);

      socket?.on(MatchSocketEvent.TELEOPERATED, onMatchTele);
      socket?.on(MatchSocketEvent.ENDGAME, onMatchEndGame);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.off(MatchSocketEvent.PRESTART, onMatchPrestart);
      socket?.off(MatchSocketEvent.START, onMatchStart);
      socket?.off(MatchSocketEvent.END, onMatchEnd);
      socket?.off(MatchSocketEvent.ABORT, onMatchAbort);

      socket?.off(MatchSocketEvent.TELEOPERATED, onMatchTele);
      socket?.off(MatchSocketEvent.ENDGAME, onMatchEndGame);
    };
  }, []);

  const onMatchPrestart = useAtomCallback((get, set) => (match: MatchKey) => {
    setState(MatchState.PRESTART_COMPLETE);
    setMode('PRESTART COMPLETE');

    // Validate that the correct match is selected, if not, update
    if (get(matchIdAtom) !== match.id) {
      set(matchIdAtom, match.id);
    }
    if (get(eventKeyAtom) !== match.eventKey) {
      set(eventKeyAtom, match.eventKey);
    }
    if (get(tournamentKeyAtom) !== match.tournamentKey) {
      set(tournamentKeyAtom, match.tournamentKey);
    }
  });

  const onMatchStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    setMode('MATCH STARTED');
  };
  const onMatchEnd = () => {
    setState(MatchState.MATCH_COMPLETE);
    setMode('MATCH COMPLETE');
  };
  const onMatchAbort = () => {
    setState(MatchState.MATCH_ABORTED);
    setMode('MATCH ABORTED');
  };

  const onMatchTele = () => setMode('TELEOPERATED');
  const onMatchEndGame = () => setMode('ENDGAME');

  return null;
};
