import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import useLocalStorage from 'src/stores/local-storage.js';
import { fieldsAtom } from 'src/stores/state/ui.js';

export const useSyncFields = () => {
  const setActiveFields = useSetAtom(fieldsAtom);
  const tournament = useCurrentTournament();
  const [localStorageState, setLocalStorage] = useLocalStorage(
    `${tournament?.eventKey}-${tournament?.tournamentKey}`,
    tournament?.fields
  );

  // Set active fields whenever the tournament changes.1
  useEffect(() => {
    if (!tournament) return;

    // This is dumb, but resolves this issue for now.  Currently, the tournament resolves,
    // but the localStorageState doesn't update fast enough.
    // So, we'll fetch it manually and double-check JUST in case...
    const stored = localStorage.getItem(
      `${tournament.eventKey}-${tournament.tournamentKey}`
    );
    if (localStorageState) {
      console.log(
        'Setting active fields from local storage state:',
        localStorage
      );
      setActiveFields(localStorageState);
    } else if (stored) {
      console.log('Setting active fields from local storage (manual):', stored);
      setActiveFields(JSON.parse(stored));
    } else {
      console.log('Setting active fields from tournament:', tournament.fields);
      setActiveFields(tournament.fields);
      setLocalStorage(tournament.fields);
    }
  }, [tournament, localStorage]);

  return null;
};

export const useActiveFields = () => {
  const [activeFields, setActiveFields] = useAtom(fieldsAtom);
  const tournament = useCurrentTournament();
  const [, setLocalStorage] = useLocalStorage(
    `${tournament?.eventKey}-${tournament?.tournamentKey}`,
    tournament?.fields
  );
  const set = (fields: string[]) => {
    if (!tournament) return;
    setActiveFields(fields);
    setLocalStorage(fields);
  };
  return [activeFields, set] as const;
};

export const useActiveFieldNumbers = () => {
  const [activeFields, setActiveFields] = useAtom(fieldsAtom);
  const tournament = useCurrentTournament();
  const [, setLocalStorage] = useLocalStorage(
    `${tournament?.eventKey}-${tournament?.tournamentKey}`,
    tournament?.fields
  );
  // Convert the fields to numbers
  const numbers = activeFields.map(
    (f) => (tournament?.fields.indexOf(f) ?? -2) + 1
  );
  const set = (fields: number[]) => {
    if (!tournament) return;
    const names = fields.map((f) => tournament.fields[f - 1]);
    setActiveFields(names);
    setLocalStorage(names);
  };
  return [numbers, set] as const;
};
