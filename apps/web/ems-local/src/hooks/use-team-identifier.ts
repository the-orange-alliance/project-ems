import { Team } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { teamIdentifierAtom } from 'src/stores/state/ui.js';

export const useTeamIdentifiers = (): Record<number, string> => {
  const identifier = useAtomValue(teamIdentifierAtom);
  const eventKey = useAtomValue(eventKeyAtom);
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

export const useTeamIdentifiersForEventKey = (
  eventKey: string | null | undefined
): Record<number, string> => {
  const identifier = useAtomValue(teamIdentifierAtom);
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
  const identifier = useAtomValue(teamIdentifierAtom);
  return useMemo(
    () =>
      Object.fromEntries(teams.map((t) => [t.teamKey, String(t[identifier])])),
    [teams, identifier]
  );
};
