import { MatchState } from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import { matchStateAtom, matchStatusAtom } from '../../stores/state/match.js';

export const useMatchStateEvents = () => {
  const setMatchState = useSetAtom(matchStateAtom);
  const setMatchStatus = useSetAtom(matchStatusAtom);

  const handleMatchPrestart = () => {
    setMatchState(MatchState.PRESTART_COMPLETE);
    setMatchStatus('PRESTART COMPLETE');
  };
  const handleMatchStart = () => {
    setMatchState(MatchState.MATCH_IN_PROGRESS);
    setMatchStatus('MATCH STARTED');
  };
  const handleMatchEnd = () => {
    setMatchState(MatchState.MATCH_COMPLETE);
    setMatchStatus('MATCH COMPLETE');
  };
  const handleMatchAbort = () => {
    setMatchState(MatchState.MATCH_ABORTED);
    setMatchStatus('MATCH ABORTED');
  };
  const handleMatchTeleop = () => {
    setMatchState(MatchState.MATCH_IN_PROGRESS);
    setMatchStatus('TELEOPERATED');
  };
  const handleMatchEndgame = () => {
    setMatchState(MatchState.MATCH_IN_PROGRESS);
    setMatchStatus('ENDGAME');
  };
  return {
    handleMatchPrestart,
    handleMatchStart,
    handleMatchEnd,
    handleMatchAbort,
    handleMatchTeleop,
    handleMatchEndgame
  };
};
