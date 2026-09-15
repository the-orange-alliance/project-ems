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
  replay marks it ready; invalid envelopes retain state and expose an error.
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

The audience program display and producer live monitor now read the authoritative
program selector. The preview bus remains on the legacy projection because it
uses the existing best-effort next-item behavior; producer command handlers and
`useCue` remain unchanged for Task 05.

## Temporary compatibility period

Realtime currently emits both the authoritative event and
`graphics:state`. The latter is produced only by the explicit
`Graphics.toLegacyState` adapter and exists for the remaining controller and
preview consumers. Compatibility command routes also continue returning
`LiveGraphicState`. Both sites are marked for Task 16 removal. New consumers
must not use `LiveGraphicState`, infer cue from program, or infer cue readiness
from the loaded index.
