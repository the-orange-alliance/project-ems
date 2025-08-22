import { apiFetcher } from '@toa-lib/client';
import {
  MatchKey,
  Match,
  MatchDetailBase,
  matchZod,
  Ranking,
  rankingZod,
  getSeasonKeyFromEventKey,
  getDefaultMatchDetailsBySeasonKey
} from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { matchAtom } from 'src/stores/state/event.js';

export const usePrestartEvent = () => {
  return useAtomCallback((get, set) => async (key: MatchKey) => {
    const { eventKey, id, tournamentKey } = key;
    const match: Match<MatchDetailBase> = await apiFetcher(
      `match/all/${eventKey}/${tournamentKey}/${id}`,
      'GET',
      undefined,
      matchZod.parse
    );
    const rankings: Ranking[] = await apiFetcher(
      `ranking/${eventKey}/${tournamentKey}/${id}`,
      'GET',
      undefined,
      rankingZod.array().parse
    );
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
    set(matchAtom, match);
    // TODO: revisit?????
    // set(matchOccurringRanksAtom, rankings);
  });
};
