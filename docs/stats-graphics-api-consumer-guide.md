# Stats & Graphics API — External Consumer Guide

Base URL for everything below: `http://localhost:8080`

Full interactive schema (request/response bodies, enums, error shapes) is published via Swagger UI — don't rely on this doc for exact field types, use the live schema:

**http://localhost:8080/docs**

The `Stats` and `Graphics` tags in that UI correspond 1:1 to the two sections below.

---

## 1. Stats API

Base path: `/stats`

The Stats API answers on-demand statistical queries (rankings, per-team/per-match aggregates, calculated metrics, etc.) for an event. It is **calculation-on-demand with a server-side cache**, not a live push feed — a consumer polls or queries it as needed.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/stats/queue` | Inspect the shared calculation queue (running + queued jobs, capacity, worker count, `queueVersion`). |
| `PUT` | `/stats/queue/order` | Reorder queued (not running) jobs. Requires `expectedQueueVersion` (optimistic concurrency) + `orderedJobIds`. |
| `GET` | `/stats/:eventKey/catalogue` | List the stat calculators available for that event's season (name/description/params for each — see below). |
| `POST` | `/stats/:eventKey/query` | Run/fetch a stat. Body selects the calculator (`stat`) and its parameters, plus an optional `refresh: boolean`. |

See the schema for `queueSchema`, `querySchema`/`queryBody`, and `responseSchema` in the Swagger docs (models: `StatsSchemas.ts` / `@toa-lib/models/seasons/stats`) — not reproduced here.

`GET /stats/:eventKey/catalogue` is documented in Swagger as a proper model (`catalogueEntrySchema`), not an opaque blob: each entry carries the stat's `name`/`description` (what it measures and how it's derived), `scope`, `units`, `family`, `dependencies`, `supportedSelectors`/`supportedFilters`, and JSON Schema for its own `paramsSchema`/`resultSchema` — so **the full stat catalogue, with human-readable explanations of every stat, is browsable directly in the Swagger UI without ever calling the endpoint.** Use this to build a stat picker, or just to look up "what does stat X actually compute."

### How it works

1. `POST /stats/:eventKey/query` normalizes your query and hashes it. That hash is the cache key.
2. If nothing is cached for that hash, the query is **enqueued** to a worker pool (`StatsWorkerPool`) and your request **waits** for the result (`cache: "miss"`, `waitedForWorker: true`).
3. If a result **is** cached, it's returned **immediately** from SQLite — no waiting — annotated with `cache: "fresh"` or `cache: "stale"`.
4. Multiple identical in-flight queries (same query hash) are coalesced into a single worker job; every caller just awaits the same result.

### The queue system

- Each event has its own on-disk stats database; a shared pool of worker threads (`StatsWorkerPool`) executes calculations. Pool size, capacity, and per-job timeout are server-configured (`STATS_WORKERS`, `STATS_QUEUE_CAPACITY`, `STATS_TIMEOUT_MS`).
- `GET /stats/queue` gives you a live snapshot: `running` jobs (one per worker slot) and `queued` jobs (FIFO, with position), each tagged with an `origin`:
  - `cold-miss` — nothing was cached.
  - `stale-refresh` — a cached value is being refreshed in the background (see caching below).
  - `explicit-refresh` — caller passed `refresh: true`.
  - `controller` — enqueued by an internal caller (e.g. the graphics playback controller), not the HTTP query route.
- `queueVersion` increments on every state change (dispatch, completion, reorder). `PUT /stats/queue/order` requires you to pass the version you last observed; a mismatch returns `409` so you never blindly reorder against stale state.
- If the queue is full and no worker is idle, `POST /query` returns `503`. A job that exceeds the timeout returns `504` and its worker is recycled.

### Caching — stale-while-revalidate

The cache is keyed on the **normalized query + a source-data marker** (latest match update time, latest history id, latest action-event id, and the calculator's version number). This is a classic **stale-while-revalidate** design:

- If the source marker hasn't changed and the calculator version matches → the cached result is `fresh`, returned instantly, nothing is recomputed.
- If the underlying match/event data has changed since the cached result was computed (or the calculator itself was upgraded) → the cached result is `stale`. It is **still returned immediately** (so your UI never blocks), but a background refresh is silently enqueued (`refreshQueued: true` in the response) so the *next* call will see fresh data.
- Every response tells you exactly where the data stands via three fields:
  - `cache`: `"fresh" | "stale" | "miss"`
  - `cacheAgeMs`: how old the returned value is
  - `refreshQueued`: whether a recompute was just triggered because this response was stale
  - `calculatedAsOfUtc` / `latestPlayedMatch` / `sourceMarker`: what data the number actually reflects

### How to always get the freshest data

By default (`refresh` omitted or `false`), you get stale-while-revalidate behavior — fast responses that may lag by one refresh cycle. If your consumer needs a **guaranteed up-to-date** value and can tolerate waiting for a calculation:

- Pass `"refresh": true` in the `POST /stats/:eventKey/query` body. This **forces** a fresh calculation and the request **awaits** the worker result before responding (`waitedForWorker: true`) — the returned value is always the just-computed one.
- Practical guidance:
  - Fast dashboards / frequent polling → don't set `refresh`; read `cache`/`cacheAgeMs`/`refreshQueued` to decide whether to show a "recalculating…" affordance.
  - "Give me the truth right now" (e.g. right before publishing a graphic to air) → set `refresh: true` and accept the extra latency of a real calculation.
  - You can also inspect `/stats/queue` beforehand if you want to know whether a refresh is already in flight for your query.

---

## 2. Stats Audience Display & Producer/Graphics API

**Port 8080 is the only supported public mutation ingress.** Point browser,
Companion, button-box, and automation commands at this API. Port 8081 still
contains deprecated command proxies for migration compatibility, but clients
must not adopt those routes; Task 16 removes them after the compatibility
window. Realtime publication is initiated by the API's durable commit, so a
successful API command is accepted even while realtime is temporarily down and
the newest pending revision is retried after recovery.

Base path: `/graphics` (two controllers share this prefix: CRUD under `/graphics/:eventKey/...`, and the live command surface under `/graphics/:eventKey/live/...`).

This section is for a consumer building an **external "simple" controller** for the audience display (e.g. a Bitfocus Companion panel, a physical button box, or a minimal custom web control). The live command routes were explicitly designed to also support **body-less GET requests** for this exact use case — every command below (except `quick-take`, which requires a full graphic spec) has a GET alias that needs no JSON body, so a simple HTTP button can drive it directly.

### Concepts

- **cue** — a graphic prepared and ready, but not yet on air.
- **program** — whatever is currently live on the audience display.
- **loaded** — the currently loaded timeline/rundown and its position (what `advance`/`previous`/`go` navigate through).
- Every command returns a `PlaybackAcknowledgment` (`ok: true/false` + the resulting `PlaybackState`), so a controller can always render the *actual* resulting state after firing a command instead of assuming success. See `playbackStateZod` / `playbackAcknowledgmentZod` in the Swagger schema.

### Live control routes (POST + GET alias, unless noted)

| Route | Purpose |
|---|---|
| `GET /graphics/:eventKey/live` | Read the current `PlaybackState` (loaded item, cue, program, staged update). Plain read, not a command. |
| `GET /graphics/:eventKey/live/publication-health` | Inspect delivery configuration, pending revision, retry/error details, and the last delivered revision. |
| `.../live/load/:timelineId` | Load a timeline onto the cue slot, reset to its first item. Optional body: `values` (template variable bindings). |
| `.../live/load-rundown/:rundownId` | Load a rundown. |
| `.../live/unload` | Durably clear the loaded timeline/rundown back to nothing. |
| `POST .../live/cue` (POST only) | Ready an ad-hoc prepared graphic spec onto the cue without touching `loaded`/`program`. |
| `.../live/advance` | Step the loaded timeline/rundown forward one item. |
| `.../live/previous` | Step backward one item. |
| `.../live/clear` | Clear whatever is on air (program). |
| `.../live/go/:index` (or `.../live/go?index=N`) | Jump to a specific **zero-based** item index in the loaded timeline. |
| `.../live/take` | Send the current cue to air (becomes `program`). Optional body `target` — if omitted, resolves to whatever is currently `ready` on the cue. |
| `POST .../live/quick-take` (POST only) | Prepare-and-air a full graphic spec in one call. Requires a `spec` in the body — no GET alias, since GET can't carry one. |
| `.../live/quick-cue/:timelineId` | **Load a timeline and decide whether it also goes to air, in one call** — see below. |
| `.../live/refresh/:destination` where `destination` is `cue` or `program` | Recalculate and re-render whatever is currently on the given destination (e.g. after underlying stats change). |
| `.../live/push-update` | Push a previously staged update live. |

All commands accept an optional `requestId` (for idempotent replay/retry safety) and `expectedRevision` (optimistic concurrency) when sent via POST with a JSON body; the GET aliases auto-generate a `requestId` and skip revision checking, which is fine for a fire-and-forget button.

#### `quick-cue` — the one-call "load and maybe take live" command

`.../live/quick-cue/:timelineId` (optional query `?force-active=in|out`):

- No query param: loads the timeline; if **nothing** is currently on air, it's also immediately taken live; if something **is** already on air, it's left ready on the cue only.
- `?force-active=in`: whatever is on air is cleared first, then this timeline is loaded and taken live.
- `?force-active=out`: whatever is on air is cleared first, then this timeline is loaded onto the cue but **not** taken live.

This is the recommended single call for a "simple controller" button that just says "play timeline X."

### Published timelines (for building a picklist)

```
GET /graphics/:eventKey/timelines?published=true
```

Returns only timelines marked `published` (i.e. producer-approved, ready for a simple controller to trigger) — omit the query param (or pass `false`) to see drafts too. Pair this with `quick-cue`/`load` above: fetch the published list to populate your controller's buttons, then call `quick-cue/:timelineId` per button press.

### Quick-adding a timeline to the producer queue

There is **no single "append one" endpoint** — the on-deck queue is read and replaced as a whole list:

1. `GET /graphics/:eventKey/queue` → returns the current `CueQueue` (`{ eventKey, entries, updatedAtUtc }`).
2. Append a new entry to `entries`: `{ entryId: <new unique id>, timelineId: <target timeline>, values: {...template vars...}, note?: string }`.
3. `PUT /graphics/:eventKey/queue` with body `{ entries: [...full updated array...] }` → saves and returns the new `CueQueue`.

Generate `entryId` client-side (any string matching `^[A-Za-z0-9_-]{1,64}$`, e.g. a UUID) — it's how the producer UI/audience queue identifies and later dequeues that run.

### Error shape

Every route in this section responds with either the normal `PlaybackAcknowledgment` (business-level success/rejection — `ok:false` with a structured `error.code`, e.g. `NOT_READY`, `CONFLICT`) or, for unexpected failures, an envelope `{ error, code, message, retryable }`. A simple controller should treat `ok:false`/non-2xx as "show the error and let the operator retry" rather than crashing — `retryable` tells you whether it's worth an automatic retry.
