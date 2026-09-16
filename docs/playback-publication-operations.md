# Playback Publication Operations

## Supported topology

The API on port 8080 is the sole public playback mutation ingress and durable
authority. A successful commit queues its complete, schema-validated
`PlaybackState` for authenticated delivery to realtime. Realtime keeps no
playback store: it validates and deduplicates publication and fans the exact
`PlaybackStateEnvelope` out as `graphics:playback-state:v1` to the event's
`graphics:<eventKey>` socket room. Subscription reads use the same contract.

Port 8081 serves authoritative reads and ephemeral preview replay only. Playback
command proxies and queue aliases are removed after operator confirmation that
deployed Companion and automation consumers use 8080. Preview replay affects
PVW presentation only and is not a playback mutation.

## Startup and credentials

Start realtime before the API when possible. Startup order is not a correctness
requirement: if realtime is unavailable, the API continues accepting durable
commands and retries publication. Configure the same high-entropy secret in
both processes as `GRAPHICS_PUBLICATION_TOKEN`; rotate it as a service
credential and do not expose it to browsers or Companion. For compatibility,
both services fall back to `JWT_SECRET` when the dedicated secret is absent.

API settings:

- `GRAPHICS_REALTIME_BASE_URL` (default `http://127.0.0.1:8081`)
- `GRAPHICS_PUBLICATION_TOKEN`
- `PLAYBACK_AUTHORITY_EPOCH` (optional deployment-supplied process epoch;
  otherwise generated at API start)
- `GRAPHICS_PUBLICATION_TIMEOUT_MS` (default 2000)
- `GRAPHICS_PUBLICATION_RETRY_BASE_MS` (default 250)
- `GRAPHICS_PUBLICATION_RETRY_MAX_MS` (default 10000)
- `GRAPHICS_PUBLICATION_SHUTDOWN_MS` (default 3000)

Realtime settings:

- `GRAPHICS_PUBLICATION_TOKEN`
- `GRAPHICS_API_BASE_URL` (default `http://127.0.0.1:8080`, used only by
  subscription hydration)
- `DISABLE_GRAPHICS` disables both graphics relay routes and publication ingest

The internal `POST /internal/graphics/playback` endpoint requires
`Authorization: Bearer <GRAPHICS_PUBLICATION_TOKEN>`. It is service-internal,
not a consumer API, and should also be restricted by network policy.

## Degraded behavior and alerting

Publication never runs inside an event's mutation lock. A slow or unavailable
realtime service therefore does not delay Clear/Take completion or roll back an
accepted state. The coordinator retains the newest pending state per event and
retries with exponential backoff capped by the configured maximum. Healthy
delivery drains each queued revision in order; during an outage, superseded
intermediate snapshots may be coalesced to the newest durable revision.

Inspect `GET /graphics/:eventKey/live/publication-health` on port 8080. Alert
when `configured` is false, `pendingRevision` remains non-null, `attempts`
continues rising, or `error` is non-null. `nextRetryAtUtc` indicates automatic
recovery timing; `lastDeliveredRevision` can be compared with the current live
state revision. Normal shutdown cancels retry timers and performs one final
drain bounded by `GRAPHICS_PUBLICATION_SHUTDOWN_MS`.

Realtime deduplicates independently per event and authority epoch. Equal or
older revisions are acknowledged without fan-out. When a new API authority
epoch appears, the prior epoch is retired so its delayed requests cannot
overwrite the replacement writer. No playback authority state is persisted in
realtime.

## Public command inventory

Port 8080 supports state reads plus these mutations: load timeline, load
rundown, unload, cue, advance, previous, go (path or query index), take, clear,
quick-take, quick-cue, refresh cue/program, atomic refresh-and-push cue/program,
push-update (optionally naming the destination it means), and atomic show advance. Every command except
cue and quick-take has a body-less Companion GET form; cue and quick-take require
a complete graphic spec and are POST-only. See the consumer guide and Swagger
for request schemas.

## Ordered show storage

The ordered show is one durable, revisioned `Rundown` per list, in
`graphics_rundown`. The producer's own show is the rundown `producer-show`,
created on first read of `GET /graphics/:eventKey/show`; every mutation is a
revision-checked `PATCH /graphics/:eventKey/rundowns/producer-show`. There is
no second store: the former `CueQueue` document held the same ordered entries
in `graphics_queue` with no revision, and the realtime room's
`graphics:queue` snapshot event was never stored by the room at all.

On first open of an event database after this change, any `graphics_queue` row
is folded into that event's `producer-show` rundown inside the same
transaction that records the marker `graphics-queue-to-producer-show-v1` in
`graphics_migration`. The marker is what makes restarts idempotent; the
original `graphics_queue` row is deliberately left in place so the
pre-migration order stays recoverable by hand. Fresh databases do not create
this table; no runtime queue API or adapter remains.
An event that already has a `producer-show` rundown is skipped rather than
overwritten, and a `graphics_queue` row whose JSON no longer parses is logged
and skipped rather than throwing - that migration runs at the top of every
graphics transaction, so failing it would take the event's graphics offline
mid-show over a legacy row that is preserved on disk regardless.

A rundown entry may reference a timeline that has since been deleted. Writes do
not reject it (that would block every later reorder or removal and force the
operator to discard their own show order); `load-rundown` does, naming the
entry and its timeline, so nothing broken reaches air.

## Coordinated rollout and rollback

1. Confirm Companion/automation uses 8080 and deploy current producer/PGM/PVW
   clients together. Clear stale browser/service-worker assets before the show.
2. Back up event databases and publication configuration. Start updated realtime,
   then API, using the same publication token; verify hydration for each event.
3. Check publication health, Cue/Take/Refresh/Push/Clear and rundown consumption
   off-air before enabling production output.

If client rollout fails, restore the prior API/realtime/web release together.
Playback/rundown schemas and program semantics are unchanged; old queue rows are
preserved for recovery, but their contents become stale after rundown edits.
Restore a database backup only when data rollback is intended. Restarting API
creates an epoch and rehydrates displays; do not reuse an epoch across writers.
See [architecture and compatibility owners](graphics-architecture.md).
