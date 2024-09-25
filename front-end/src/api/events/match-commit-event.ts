import { apiFetcher } from '@toa-lib/client';
import { MatchKey, rankingZod } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import { matchOccurringRanksAtom } from 'src/stores/recoil';

export const useCommitEvent = () => {
  return useRecoilCallback(
    ({ set }) =>
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
