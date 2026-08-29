import {
  MatchKey,
  Match,
  MatchDetailBase,
  matchZod,
  Ranking,
  getSeasonKeyFromEventKey,
  getDefaultMatchDetailsBySeasonKey
} from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import {
  matchAtom,
  matchOccurringRanksAtom,
  postCommitRanksFetchAtom
} from 'src/stores/state/event.js';
import { localClient } from 'src/api/http-clients.js';
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
      const payload = await withRetry(() =>
        localClient.get<unknown>(
          `/match/all/${eventKey}/${tournamentKey}/${id}`
        )
      );
      if (!payload) {
        throw new Error(
          `Match not found: ${eventKey}/${tournamentKey}/${String(id)}`
        );
      }
      const match: Match<MatchDetailBase> = matchZod.parse(payload);
      let rankings: Ranking[] = [];
      try {
        rankings = await fetchMatchRankings(key);
      } catch (e) {
        // Rankings are best-effort here — still show the new match rather
        // than aborting the whole prestart and leaving the display stuck.
        console.error('Failed to fetch rankings for match prestart', e);
      }
      const seasonKey = getSeasonKeyFromEventKey(eventKey);
      const details = getDefaultMatchDetailsBySeasonKey(seasonKey);
      match.details = { eventKey, id, tournamentKey, ...details };
      // All four penalty counters clear together. Prestart is the first step of
      // the match cycle, so it is the reset point; penalties and cards awarded
      // "before the match starts" are awarded after prestart, once the referee
      // screens have a match loaded, and so are unaffected by this.
      match.redMinPen = 0;
      match.blueMinPen = 0;
      match.redMajPen = 0;
      match.blueMajPen = 0;
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
