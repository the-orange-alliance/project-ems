import { Displays } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { displayIdAtom } from 'src/stores/state/audience-display.js';
import { matchAtom, matchOccurringRanksAtom } from 'src/stores/state/event.js';
import { ensurePostCommitRanks } from './post-commit-ranks.js';

// How long to hold the switch to the results screen while waiting for fresh
// rankings before giving up and showing it with ranks hidden.
const SHOW_RESULTS_DEADLINE_MS = 5000;

// Bumped on every display event so a superseded results handler (still
// awaiting its rankings fetch) can tell it lost and must not touch state.
let displaySeq = 0;

export const useDisplayEvent = () => {
  return useAtomCallback(async (get, set, id: number) => {
    const seq = ++displaySeq;

    if (id !== Displays.MATCH_RESULTS) {
      set(displayIdAtom, id);
      return;
    }

    const match = get(matchAtom);
    if (!match) {
      // Cold start / replay before match state arrives. Show the screen —
      // DisplaySwitcher renders nothing without a match anyway, and the
      // COMMIT/PRESTART replays will populate match + ranks.
      set(displayIdAtom, id);
      return;
    }

    // Reuse the post-commit rankings fetch if the commit handler already
    // started one; otherwise start it now. Hold the screen switch until it
    // resolves or the deadline passes, so stale ranks never flash on screen.
    const outcome = await Promise.race([
      ensurePostCommitRanks(get, set, match),
      new Promise<'deadline'>((resolve) =>
        setTimeout(() => resolve('deadline'), SHOW_RESULTS_DEADLINE_MS)
      )
    ]);

    // A newer display event took over while we waited — do nothing.
    if (seq !== displaySeq) return;

    if (outcome === 'deadline' || outcome === null) {
      // Failure or deadline: hide ranks rather than risk showing wrong ones.
      // If the fetch is still in flight and later succeeds, the shared
      // promise fills the ranks in live.
      set(matchOccurringRanksAtom, []);
    }
    set(displayIdAtom, id);
  });
};
