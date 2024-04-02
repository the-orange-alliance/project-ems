import { FC, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useMatchesForEvent } from 'src/api/use-match-data';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';
import { matchesByEventKeyAtomFam } from 'src/stores/recoil';

export const SyncMatchesToRecoil: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const setMatches = useSetRecoilState(
    matchesByEventKeyAtomFam(eventKey) ?? ''
  );
  const { data: matches } = useMatchesForEvent(eventKey);
  useEffect(() => {
    if (matches) {
      setMatches(matches);
    }
  }, [matches]);
  return null;
};
