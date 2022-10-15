import { useEffect, useState } from 'react';
import { MatchState } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';

export interface ControlButtons {
  prestartEnabled: boolean;
  audienceDisplayEnabled: boolean;
  fieldPrepEnabled: boolean;
  fieldDumpEnabled: boolean;
  startMatchEnabled: boolean;
  commitEnabled: boolean;
  postResultsEnabled: boolean;
}

export const useButtonState = (): ControlButtons => {
  const state = useRecoilValue(matchStateAtom);
  const [buttonStates, setButtonStates] = useState<ControlButtons>({
    prestartEnabled: false,
    audienceDisplayEnabled: false,
    fieldPrepEnabled: false,
    fieldDumpEnabled: false,
    startMatchEnabled: false,
    commitEnabled: false,
    postResultsEnabled: false
  });

  useEffect(() => {
    switch (state) {
      case MatchState.MATCH_NOT_SELECTED:
        setButtonStates({
          prestartEnabled: false,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.PRESTART_READY:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.PRESTART_COMPLETE:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: true,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.AUDIENCE_READY:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: true,
          fieldPrepEnabled: true,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.FIELD_READY:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: true,
          fieldPrepEnabled: false,
          fieldDumpEnabled: true,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.MATCH_READY:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: true,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: true,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.MATCH_IN_PROGRESS:
        setButtonStates({
          prestartEnabled: false,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: true,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.MATCH_ABORTED:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      case MatchState.MATCH_COMPLETE:
        setButtonStates({
          prestartEnabled: false,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: true,
          postResultsEnabled: false
        });
        break;
      case MatchState.RESULTS_READY:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: true,
          postResultsEnabled: false
        });
        break;
      case MatchState.RESULTS_COMMITTED:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: true
        });
        break;
      case MatchState.RESULTS_POSTED:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
      default:
        setButtonStates({
          prestartEnabled: true,
          audienceDisplayEnabled: false,
          fieldPrepEnabled: false,
          fieldDumpEnabled: false,
          startMatchEnabled: false,
          commitEnabled: false,
          postResultsEnabled: false
        });
        break;
    }
  }, [state]);

  return buttonStates;
};
