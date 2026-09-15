# Task 09 — Producer and Preview Loading/Error Identity

Implemented a shared `LoadState<T>` contract for `loading`, `ready`,
`unavailable`, and `error`, with source identity and structured failure details.
Quick Stat and Timeline List now show accessible loading/error/unavailable copy
and retry actions. Fetch failures cannot masquerade as valid empty/filter results,
and stale catalogue rows cannot be cued through Enter after a fetch error.

PVW waits for catalogue, teams, and matches before querying. Its hook preserves
source, transport, decoding, and semantic adaptation failures and supports retry.
Missing collection responses and malformed catalogue/query responses are validation
errors; a real `[]` remains valid empty data. The catalogue decoder is checked
against the service's real metadata, including generic stats that omit seasonKey.
Semantic `not_found`,
`insufficient_data`, and `unavailable` outcomes (including valid HTTP 422 bodies)
remain unavailable outcomes. HTTP 503 means service unavailable; other HTTP and
network failures remain errors. An empty prepared frame remains ready, and no next
spec is explicitly `ready` with no graphic. Legacy generic adapter exception
fallbacks are promoted to adaptation errors; legitimate empty legacy frames
receive explicit emptyReason copy while keeping normal notes.

Preview cache identity now includes the event, canonical spec, catalogue slug/id
mapping, and canonical roster content. Roster fields match what generic and
semantic adapters consume: team key/number/short name; match id/tournament/name;
participant team key/station for alliance grouping. Object property order does
not change identity. Array order is retained because adapters use first-match
lookups and participant maps. Same-count renames, replacements, and alliance
changes invalidate the preview.

Each cached preview outcome carries its requested identity and event. While B
calculates, retained A stays paired with A's resolved spec/frame beneath a visible
`CALCULATING NEXT CUE` overlay naming B and identifying the retained cue. Late
responses cannot become a different requested cue. Different-event content is
never retained. Replay requests received while calculating apply only when the
requested result is ready; reconnect does not start background preview queries.

PVW displays unavailable alarms and source/error diagnostics with retry. Alarm
copy describes off-air calculation availability rather than certifying future
authoritative playback. Renderer crashes log the failed spec and frame kind,
notify off-air consumers, and remove the entire graphic shell on PGM so the
audience output stays transparent. Corrected frames recover; PVW also has a
renderer retry action. No audience diagnostic UI or transition-machine changes
were introduced. Preview remains independent of authoritative preparation.

Discovery covered F-011 and UI findings F4/F10/F15/F16/F19. Task 07 already handles
bounded On Deck warming, honest success/failure counts, and warming after timeline
arrival; those behaviors were preserved. Stats backend cache invalidation is
unchanged.

Regression coverage includes source loading/decode errors and recovery, query
network/HTTP/decode/semantic errors, normal unavailable outcomes, valid empty
frames, retained A while B loads or fails, delayed retry, late responses, event
changes, roster content edits, accessible producer/PVW copy, replay gating, and
PGM renderer/source fail-closed behavior.

Validation:

- `npm test --workspace ems-web`: passed, 136 tests across 21 files.
- `npm test --workspace api`: passed, 177 tests.
- `npm run lint --workspace ems-web`: reports 147 existing errors in untouched
  files (formatting, unused symbols, destructuring, and React prop validation).
  All changed Task 09 source/test files pass a separate ESLint check.
- `git diff --check`: passed.
- `npm run check-types --workspace ems-web`: passed.
- ESLint across all changed Task 09 source/test files: passed.
