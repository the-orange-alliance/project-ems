import { Team } from '@toa-lib/models';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { teamIdentifierAtom } from 'src/stores/recoil';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';
import { useTeamsForEvent } from 'src/api/use-team-data';

export const useTeamIdentifiers = (): Record<number, string> => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: teams } = useTeamsForEvent(eventKey);
  return useMemo(
    () =>
      teams
        ? Object.fromEntries(
            teams.map((t) => [t.teamKey, String(t[identifier])])
          )
        : {},
    [teams, identifier]
  );
};

export const useTeamIdentifierRecord = (
  teams: Team[]
): Record<number, string> => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  return useMemo(
    () =>
      Object.fromEntries(teams.map((t) => [t.teamKey, String(t[identifier])])),
    [teams, identifier]
  );
};
