import { randomUUID } from 'node:crypto';

/**
 * In-memory revision tokens for the two event tables the SQL source marker
 * cannot fingerprint: `ranking` and `alliance` carry no `updatedAtUtc` and no
 * monotonic id, so `readSourceMarker()` has nothing cheap to read for them.
 * Instead, the API calls that write those tables bump a token here, and
 * `StatsCache` folds both tokens into the source marker it compares.
 *
 * Tokens are compared by inequality only. Each one is a fresh random value -
 * including at process start - so an API restart (which resets these while
 * `stat_cache` persists) can never reproduce a previously cached token: every
 * cached entry mismatches once and recomputes, the fail-safe direction. A
 * counter restarting at 0 could collide with a cached value after the same
 * number of bumps and serve stale data as fresh.
 *
 * Process-global rather than per-event: a bump invalidates ranking/alliance
 * consumers for every event, which only costs one recompute.
 *
 * Deliberately NOT tracked (accepted staleness, chosen rather than missed):
 * - `team`: set-and-forget in practice. J1's use of `Team.country` /
 *   `countryCode` can serve a stale `fresh` entry after a team edit.
 * - global `fcs_settings`: not event-scoped. B17/B18's use of
 *   `wildfireBallsPerLed` can serve a stale `fresh` entry after a settings edit.
 * A producer's explicit refresh (`refresh: true` / playback `refresh`) always
 * recomputes regardless of the marker.
 */
let rankingsRevision = randomUUID();
let alliancesRevision = randomUUID();

/** Called only by the ranking API calls that write `ranking`. */
export function bumpRankingsRevision() {
  rankingsRevision = randomUUID();
}

/** Called only by the alliance API calls that write `alliance`. */
export function bumpAlliancesRevision() {
  alliancesRevision = randomUUID();
}

export function sourceRevisions() {
  return { rankingsRevision, alliancesRevision };
}

/** Restores process-start state (new random tokens). Exported so tests can simulate an API restart. */
export function resetSourceRevisions() {
  rankingsRevision = randomUUID();
  alliancesRevision = randomUUID();
}
