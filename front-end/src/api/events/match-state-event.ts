import { MatchState } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import { matchStateAtom, matchStatusAtom } from 'src/stores/recoil';

export const useMatchStateEvents = () => {
  const handleMatchPrestart = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.PRESTART_COMPLETE);
    set(matchStatusAtom, 'PRESTART COMPLETE');
  });
  const handleMatchStart = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.MATCH_IN_PROGRESS);
    set(matchStatusAtom, 'MATCH STARTED');
  });
  const handleMatchEnd = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.MATCH_COMPLETE);
    set(matchStatusAtom, 'MATCH COMPLETE');
  });
  const handleMatchAbort = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.MATCH_ABORTED);
    set(matchStatusAtom, 'MATCH ABORTED');
  });
  const handleMatchTeleop = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.MATCH_IN_PROGRESS);
    set(matchStatusAtom, 'TELEOPERATED');
  });
  const handleMatchEndgame = useRecoilCallback(({ set }) => async () => {
    set(matchStateAtom, MatchState.MATCH_IN_PROGRESS);
    set(matchStatusAtom, 'ENDGAME');
  });
  return {
    handleMatchPrestart,
    handleMatchStart,
    handleMatchEnd,
    handleMatchAbort,
    handleMatchTeleop,
    handleMatchEndgame
  };
};
