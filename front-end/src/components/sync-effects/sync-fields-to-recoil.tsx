import { useRecoilState, useSetRecoilState } from 'recoil';
import { activeFieldsAtom } from 'src/stores/recoil';
import { useEffect } from 'react';
import { useCurrentTournament } from 'src/api/use-tournament-data';
import useLocalStorage from 'src/stores/local-storage';

export const useSyncFieldsToRecoil = () => {
  const setActiveFields = useSetRecoilState(activeFieldsAtom);
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
      console.log('Setting active fields from local storage state:', localStorage);
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
  const [activeFields, setActiveFields] = useRecoilState(activeFieldsAtom);
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
