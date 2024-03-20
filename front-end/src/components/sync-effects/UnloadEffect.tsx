import { MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { matchStateAtom } from 'src/stores/NewRecoil';

const UnloadEffect: FC = () => {
  const state = useRecoilValue(matchStateAtom);

  useEffect(() => {
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const onUnload = (e: BeforeUnloadEvent) => {
    if (state >= MatchState.PRESTART_COMPLETE) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  return null;
};

interface Props {
  hasUnsavedChanges: boolean;
}

// TODO - figure out why this doesn't work
export const UnsavedChangesEffect: FC<Props> = ({ hasUnsavedChanges }) => {
  useEffect(() => {
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const onUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  return null;
};

export default UnloadEffect;
