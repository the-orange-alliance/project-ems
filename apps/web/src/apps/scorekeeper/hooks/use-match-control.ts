import { MatchState } from '@toa-lib/models';
import { useAtom } from 'jotai';
import { matchStateAtom } from 'src/stores/state/match.js';

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
  canEditDetails: boolean;
  setState: (state: MatchState) => void;
}

export const useMatchControl = (): MatchControlState => {
  const [matchState, setState] = useAtom(matchStateAtom);
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canCommitScores: false,
        canPostResults: false,
        canEditDetails: true,
        setState
      };
    case MatchState.MATCH_ABORTED:
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
        canEditDetails: false,
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
        canEditDetails: false,
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
        canEditDetails: false,
        setState
      };
    case MatchState.RESULTS_POSTED:
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
        canEditDetails: false,
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
        canEditDetails: false,
        setState
      };
  }
};
