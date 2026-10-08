import { MatchKey, matchZod } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { localClient } from 'src/api/http-clients.js';
import { matchAtom } from 'src/stores/state/event.js';
import { ensurePostCommitRanks } from './post-commit-ranks.js';

// Load of the most recently committed match. The results screen awaits it so it
// renders what was committed, not the live/prestart copy this client holds -
// a match edited and reposted from the schedule editor never streams updates.
let committedMatchLoad: Promise<void> = Promise.resolve();
export const awaitCommittedMatch = () => committedMatchLoad;

export const useCommitEvent = () => {
  return useAtomCallback(async (get, set, key: MatchKey) => {
    // Assigned synchronously so a DISPLAY event right behind this COMMIT sees it.
    committedMatchLoad = localClient
      .get<unknown>(`/match/all/${key.eventKey}/${key.tournamentKey}/${key.id}`)
      .then((payload) => set(matchAtom, matchZod.parse(payload)))
      .catch((e) => console.error('Failed to load committed match', e));
    await committedMatchLoad;
    await ensurePostCommitRanks(get, set, key);
  });
};
