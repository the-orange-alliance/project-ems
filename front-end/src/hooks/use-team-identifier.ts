import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import {
  currentEventKeySelector,
  teamIdentifierAtom,
  teamsByEventSelectorFam
} from 'src/stores/NewRecoil';

export const useTeamIdentifiers = (): Record<number, string> => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const eventKey = useRecoilValue(currentEventKeySelector);
  const teams = useRecoilValue(teamsByEventSelectorFam(eventKey));
  return useMemo(
    () =>
      Object.fromEntries(teams.map((t) => [t.teamKey, String(t[identifier])])),
    [teams, identifier]
  );
};
