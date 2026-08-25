import { MatchKey } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { ensurePostCommitRanks } from './post-commit-ranks.js';

export const useCommitEvent = () => {
  return useAtomCallback(async (get, set, key: MatchKey) => {
    await ensurePostCommitRanks(get, set, key);
  });
};
