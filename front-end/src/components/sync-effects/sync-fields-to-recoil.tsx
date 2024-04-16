import { useRecoilState, useSetRecoilState } from 'recoil';
import { activeFieldsAtom } from 'src/stores/recoil';
import { useEffect } from 'react';
import { useCurrentTournament } from 'src/api/use-tournament-data';
import useLocalStorage from 'src/stores/LocalStorage';

export const useSyncFieldsToRecoil = () => {
  const setActiveFields = useSetRecoilState(activeFieldsAtom);
  const tournament = useCurrentTournament();
  const [localStorage, setLocalStorage] = useLocalStorage(
    `${tournament?.eventKey}-${tournament?.tournamentKey}`,
    tournament?.fields
  );

  // Set active fields whenever the tournament changes.1
  useEffect(() => {
    if (!tournament) return;
    if (localStorage) {
      console.log('Setting active fields from local storage:', localStorage);
      setActiveFields(localStorage);
    } else {
      console.log('Setting active fields from tournament:', localStorage);
      setActiveFields(tournament.fields);
      setLocalStorage(tournament.fields);
    }
  }, [tournament]);

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
