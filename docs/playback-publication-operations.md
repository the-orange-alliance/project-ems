# Playback Publication Operations

## Supported topology

The API on port 8080 is the sole public playback mutation ingress and durable
authority. A successful commit queues its complete, schema-validated
`PlaybackState` for authenticated delivery to realtime. Realtime keeps no
playback store: it validates and deduplicates the publication, projects it to
the existing `LiveGraphicState` browser shape, and fans it out to the event's
`graphics:<eventKey>` socket room.

Port 8081 `/graphics/:eventKey/live/*` command routes are deprecated proxies.
They forward to port 8080 and return `Deprecation: true`; they no longer
broadcast the returned acknowledgment. This makes relayed and direct commands
converge on the same commit-driven publication path. Task 16 removes the
proxies after external Companion and automation clients have moved to 8080.
The relay-only preview replay signal is presentational and is not a playback
mutation.

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
  compatibility proxies and subscription hydration)
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
quick-take, quick-cue, refresh cue/program, and push-update. Every command except
cue and quick-take has a body-less Companion GET form; cue and quick-take require
a complete graphic spec and are POST-only. See the consumer guide and Swagger
for request schemas.

Port 8081 temporarily proxies load, unload, advance, previous, go, take,
quick-take, clear, refresh, push-update, and the legacy queue aliases. It does
not define the full authoritative command surface and must not be used for new
integrations.
