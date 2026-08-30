import { Match, RESULT_NOT_PLAYED } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { matchApi } from 'src/api/use-match-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { pairedFieldAtom } from 'src/stores/state/ui.js';

/**
 * Looks up the paired field's most recent match strictly before the current
 * one (by `id`, within the same tournament) via a fresh, uncached fetch, and
 * reports whether it's still unplayed — i.e. whether Set Displays should
 * block on the confirmation dialog.
 *
 * Only meaningful when `pairedFieldAtom` is non-empty; callers should check
 * that themselves and skip calling this entirely otherwise (see
 * displays-button.tsx) — issue #262.
 */
export const usePairedFieldGate = () => {
  const pairedField = useAtomValue(pairedFieldAtom);
  const tournament = useCurrentTournament();

  return useCallback(
    async (match: Match<any>): Promise<boolean> => {
      if (!pairedField || !tournament) return false; // defensive; see note above
      const pairedFieldNumber = tournament.fields.indexOf(pairedField) + 1;
      if (pairedFieldNumber <= 0) return false; // stored field name no longer exists on this tournament
      try {
        // Fresh fetch — deliberately not a cached SWR hook or any atom, since
        // match results change during the event and this must reflect what's
        // true right now, not what was true on page load. Implicitly
        // tournament-scoped: `matchApi.get.schedule` only returns matches for
        // `match.tournamentKey`, so a new phase (e.g. Playoffs) restarting
        // `id` at 1 naturally has no "previous" match to find yet.
        const matches = await matchApi.get.schedule(
          match.eventKey,
          match.tournamentKey
        );
        const previous = matches
          .filter((m) => m.fieldNumber === pairedFieldNumber && m.id < match.id)
          .sort((a, b) => b.id - a.id)[0];
        // No previous match on the paired field at all (this is the first
        // match of the tournament on that field) — nothing to wait for.
        if (!previous) return false;
        return previous.result === RESULT_NOT_PLAYED;
      } catch (e) {
        // Fail open: a failed lookup should never leave the scorekeeper
        // unable to proceed. Same fail-soft posture as `withPersistedFields`
        // on the server and webhook emits on the client.
        console.error('Failed to check paired field status; not blocking:', e);
        return false;
      }
    },
    [pairedField, tournament]
  );
};
