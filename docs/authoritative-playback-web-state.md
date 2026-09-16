# Authoritative playback state for web clients

## Contract

`PlaybackStateEnvelope` is the lossless browser/realtime contract. Version 1 is
served by both the API and realtime relay at
`GET /graphics/:eventKey/live/state/v1` and emitted as
`graphics:playback-state:v1` after an event-scoped `graphics:subscribe`.

The strict envelope contains `schemaVersion`, `authorityEpoch`, `eventKey`, and
the validated `PlaybackState`. The nested state is deliberately not projected:
it retains revision; loaded snapshot, index, source, and values; every cue lane
status/error/graphic; program graphic and target; every staged-update
status/destination/error/graphic; transition and effective time; and updated
time. API publication, API reads, realtime reads, replay, and live socket
delivery use this same schema.

The authority epoch is a random UUID generated once with the API process-wide
playback coordinator. It is never derived from a browser/socket connection or
from wall-clock ordering. Restarting the API always creates a new epoch, which
permits a durable state with a lower revision to replace browser state.

## Ordering and hydration invariants

- Socket listeners are installed before `graphics:subscribe` requests replay.
- State is keyed by payload `eventKey`; changing the selected event does not
  overwrite or reuse another event's cursor.
- A first valid envelope is accepted.
- A non-retired new epoch atomically replaces the complete event record,
  regardless of its revision, and retires the previous epoch.
- Within one epoch, greater revisions and equal-revision full replay are
  accepted. Lower revisions are discarded.
- Any later message from a retired epoch is discarded, even if its revision is
  higher.
- Disconnect marks delivery disconnected but preserves the last complete state.
  Reconnect marks it hydrating and asks the authority for a full replay. A valid
  replay marks it ready; an invalid envelope retains state and exposes an error,
  and is a failed hydration for a client that never hydrated.
- Hydration failure is a state, not silence. A relay that cannot read the
  authority emits `graphics:playback-hydration-error:v1` to the subscribing
  socket only, carrying the upstream reason; a subscribe that produces nothing
  at all within `HYDRATION_TIMEOUT_MS` is called failed by the client itself.
  Delivery then moves to `failed`, and to `recovering` while a bounded,
  backed-off fallback read of `GET /graphics/:eventKey/live/state/v1` runs
  (`HYDRATION_RECOVERY_BACKOFF_MS`, single-flight per event key). That fallback
  is a read of the same authority: its response goes through
  `applyPlaybackEnvelope` exactly like a socket delivery, so it can never
  overwrite a newer envelope, revive a retired epoch, or write another event.
  The producer is the only surface that shows the failure and the manual retry;
  PGM/PVW stay fail-closed and render nothing.
- Realtime restart does not define ordering. Realtime fetches the envelope from
  the API authority for every subscribe/replay, so an empty relay cache cannot
  freeze or fabricate browser state.

## Client inventory and selectors

The event-scoped selector factories in `stores/state/graphics.ts` are the handoff
surface:

- Task 05 producer controls: `playbackStateForEventAtom`,
  `playbackLoadedForEventAtom`, `playbackCueForEventAtom`,
  `playbackStagedUpdateForEventAtom`, `playbackErrorsForEventAtom`, and
  `playbackDeliveryForEventAtom`.
- Task 08 display/program work: `playbackProgramForEventAtom`; the program
  graphic is read directly and is never reconstructed from cue or loaded index.
- Task 09 reconnect/operability work: `playbackEnvelopeForEventAtom` and
  `playbackDeliveryForEventAtom`.
- Task 10 transition consolidation: `playbackTransitionForEventAtom` together
  with envelope epoch and state revision from `playbackEnvelopeForEventAtom`.

Current-event convenience selectors are also exported as `playbackStateAtom`,
`loadedPlaybackAtom`, `cuePlaybackAtom`, `programPlaybackAtom`,
`stagedUpdatePlaybackAtom`, `transitionPlaybackAtom`, `playbackErrorsAtom`, and
`playbackDeliveryAtom`. Explicit-event selectors must be used by pinned display
routes so global event selection cannot redirect an audience screen.

The producer, audience program display, preview display and live monitor now
consume this authoritative store. All producer playback commands go to port
8080 and return acknowledgments. PVW uses `nextPlaybackPreviewSpec` over the
loaded snapshot, anchored to the program position, and calculates off-air.
Realtime emits only the authoritative envelope. The former state projection,
store and command proxies are removed. See [architecture](graphics-architecture.md)
for retained data/presentation compatibility and owners.
