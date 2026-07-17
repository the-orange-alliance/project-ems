import { apiFetcher } from '@toa-lib/client';
import {
  MatchKey,
  Match,
  MatchDetailBase,
  matchZod,
  getSeasonKeyFromEventKey,
  getDefaultMatchDetailsBySeasonKey
} from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import {
  matchAtom,
  matchOccurringRanksAtom,
  postCommitRanksFetchAtom
} from 'src/stores/state/event.js';
import { fetchMatchRankings } from 'src/api/use-ranking-data.js';
import { withRetry } from 'src/api/with-retry.js';

export const usePrestartEvent = () => {
  const setMatch = useSetAtom(matchAtom);
  const setMatchRanks = useSetAtom(matchOccurringRanksAtom);
  const setPostCommitRanksFetch = useSetAtom(postCommitRanksFetchAtom);

  return async (key: MatchKey) => {
    const { eventKey, id, tournamentKey } = key;
    // New match cycle — the previous match's post-commit fetch is done with.
    setPostCommitRanksFetch(null);
    try {
      const match: Match<MatchDetailBase> = await withRetry(() =>
        apiFetcher(
          `match/all/${eventKey}/${tournamentKey}/${id}`,
          'GET',
          undefined,
          matchZod.parse
        )
      );
      const rankings = await fetchMatchRankings(key);
      const seasonKey = getSeasonKeyFromEventKey(eventKey);
      const details = getDefaultMatchDetailsBySeasonKey(seasonKey);
      match.details = { eventKey, id, tournamentKey, ...details };
      match.redMinPen = 0;
      match.blueMinPen = 0;
      match.redScore = 0;
      match.blueScore = 0;
      match.result = -1;
      // Reset participant cards
      if (match.participants) {
        for (const participant of match.participants) {
          participant.cardStatus = 0;
          participant.disqualified = 0;
          participant.noShow = 0;
        }
      }
      setMatch(match);
      setMatchRanks(rankings);
    } catch (e) {
      // This handler runs inside a comlink-proxied callback, so a rejection
      // here would otherwise disappear without a trace — leaving the display
      // silently stuck on the previous match.
      console.error('Failed to handle match prestart', e);
    }
  };
};
