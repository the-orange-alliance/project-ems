import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import {
  eventKeyAtom,
  matchAtom,
  tournamentKeyAtom
} from 'src/stores/state/index.js';

export const useSyncInProgress = () => {
  const currentEvent = useAtomValue(eventKeyAtom);
  const currentTournament = useAtomValue(tournamentKeyAtom);
  const { data: tournamentMatches } = useMatchesForTournament(
    currentEvent,
    currentTournament
  );
  const [match, setMatchOccurring] = useAtom(matchAtom);

  // This is a hacky-hack to get around a race condition.
  // Scenerio: Page is reloaded after prestart, and we are at _some_ match state either prestart or beyond.
  // 1. socket sends us info telling us about the prestart
  // 2. statefullness picks up, fetches match, and sets matchAtom (which in turn updates matchesAtom)
  // 3. Page finishes loading, main /matches/:eventKey returns and updates matchesAtom, which clears out the
  //      participants and details of the prestarted match, since matchAtom is a derrivative of matchesAtom
  // 4. participants and details disappear and everything is sad.
  useEffect(() => {
    if (tournamentMatches && match && !match.participants) {
      const matchWithInfo = tournamentMatches.find((m) => m.id === match.id);
      if (matchWithInfo) {
        setMatchOccurring(matchWithInfo);
      }
    }
  }, [tournamentMatches, match]);
};
