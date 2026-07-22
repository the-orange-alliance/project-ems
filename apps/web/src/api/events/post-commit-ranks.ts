import { MatchKey, Ranking } from '@toa-lib/models';
import { Getter, Setter } from 'jotai';
import {
  matchAtom,
  matchOccurringRanksAtom,
  postCommitRanksFetchAtom
} from 'src/stores/state/event.js';
import { fetchMatchRankings } from 'src/api/use-ranking-data.js';
import { isSameMatch } from './is-same-match.js';

/**
 * Returns the shared post-commit rankings fetch for the given match, starting
 * one if none exists yet. The commit and display event handlers both call
 * this, so whichever fires first owns the network request and the other
 * reuses its promise — no double-call. The rankings are applied to
 * matchOccurringRanksAtom whenever the fetch resolves (early is fine —
 * preview screens hide ranks once the match has started; late fills the
 * results screen in live). Resolves null if all retries failed, in which
 * case the cache entry is cleared so a later caller can retry fresh.
 */
export const ensurePostCommitRanks = (
  get: Getter,
  set: Setter,
  key: MatchKey
): Promise<Ranking[] | null> => {
  const existing = get(postCommitRanksFetchAtom);
  if (existing && isSameMatch(existing.key, key)) {
    return existing.promise;
  }
  const promise = fetchMatchRankings(key)
    .then((rankings) => {
      // Don't stomp a newer match's ranks with a delayed response.
      if (isSameMatch(get(matchAtom), key)) {
        set(matchOccurringRanksAtom, rankings);
      }
      return rankings;
    })
    .catch((e) => {
      console.error('Failed to fetch post-commit rankings', e);
      if (get(postCommitRanksFetchAtom)?.promise === promise) {
        set(postCommitRanksFetchAtom, null);
      }
      return null;
    });
  set(postCommitRanksFetchAtom, { key, promise });
  return promise;
};
