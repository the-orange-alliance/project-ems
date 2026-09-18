# Task 04 — Authoritative Playback State for Web Clients

## Completed

Added a strict `PlaybackStateEnvelope` v1 shared by API publication, API and
realtime reads, socket replay, and browser delivery. The envelope retains the
complete validated `PlaybackState` and uses a process-lifetime UUID authority
epoch with deterministic revision ordering, reconnect hydration, event
isolation, equal-revision replay, and retired-epoch rejection.

Added event-scoped Jotai state and selectors for loaded, cue, program, staged
updates, transitions, errors, and delivery status. The audience program display
and producer live monitor now consume authoritative program state. The legacy
`LiveGraphicState` event and adapter remain explicitly marked for Task 16;
producer command handlers, `useCue`, and transition semantics were not changed.

## Verification

- Models: 212 tests passed.
- API: 150 tests passed.
- Realtime production build passed.
- Web: 14 tests passed across 9 files.
- Web type check and API production build passed.

## Handoff

Tasks 05, 08, 09, and 10 should consume the event-scoped selectors documented
in `docs/authoritative-playback-web-state.md`. New consumers must use the
authoritative envelope and must not reconstruct cue state from program or the
loaded index.
