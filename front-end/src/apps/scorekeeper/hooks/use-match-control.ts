import { MatchState } from '@toa-lib/models';
import { useRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/recoil';

interface MatchControlState {
  canPrestart: boolean;
  canCancelPrestart: boolean;
  canSetDisplays: boolean;
  canPrepField: boolean;
  canStartMatch: boolean;
  canAbortMatch: boolean;
  canResetField: boolean;
  canCommitScores: boolean;
  canPostResults: boolean;
  setState: (state: MatchState) => void;
}

export const useMatchControl = (): MatchControlState => {
  const [matchState, setState] = useRecoilState(matchStateAtom);
  switch (matchState) {
    case MatchState.MATCH_NOT_SELECTED:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.PRESTART_READY:
      return {
        canPrestart: true,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.PRESTART_COMPLETE:
      return {
        canPrestart: false,
        canCancelPrestart: true,
        canSetDisplays: true,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.AUDIENCE_READY:
      return {
        canPrestart: false,
        canCancelPrestart: true,
        canSetDisplays: true,
        canPrepField: true,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.FIELD_READY:
      return {
        canPrestart: false,
        canCancelPrestart: true,
        canSetDisplays: true,
        canPrepField: true,
        canStartMatch: true,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.MATCH_IN_PROGRESS:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: true,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
    case MatchState.MATCH_COMPLETE:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: true,
        canCommitScores: true,
        canPostResults: false,
        setState
      };
    case MatchState.RESULTS_READY:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: true,
        canCommitScores: true,
        canPostResults: false,
        setState
      };
    case MatchState.RESULTS_COMMITTED:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: true,
        setState
      };
    default:
      return {
        canPrestart: false,
        canCancelPrestart: false,
        canSetDisplays: false,
        canPrepField: false,
        canStartMatch: false,
        canAbortMatch: false,
        canResetField: false,
        canCommitScores: false,
        canPostResults: false,
        setState
      };
  }
};
