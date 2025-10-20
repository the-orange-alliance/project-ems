import { apiFetcher } from '@toa-lib/client';
import { MatchKey, rankingZod } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { matchOccurringRanksAtom } from 'src/stores/state/event.js';

export const useCommitEvent = () => {
  return useAtomCallback(
    (get, set) =>
      async ({ eventKey, tournamentKey, id }: MatchKey) => {
        const rankings = await apiFetcher(
          `ranking/${eventKey}/${tournamentKey}/${id}`,
          'GET',
          undefined,
          rankingZod.array().parse
        );

        set(matchOccurringRanksAtom, rankings);
      }
  );
};
