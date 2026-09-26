# Production statistics API and operations

Branch base: PR #281 at 64e37a0a6a9c16d8e5d66affa53d70211f45b266. The reviewed WAL, busy-timeout, atomic-revision and fetch-timeout changes were absent and are included here. No old-event audit migration is added.

## API

- GET /stats/:eventKey/catalogue lists all portable and matching season registrations, including parameter/result JSON schemas.
- POST /stats/:eventKey/query accepts stat, selectors, filters, params and an optional refresh boolean.
- GET /stats/queue returns queueVersion, configured capacity/worker count, running jobs and ordered queued jobs.
- PUT /stats/queue/order accepts expectedQueueVersion and every queued UUID exactly once. Version conflict returns 409 plus the current queue; invalid sets return 400. Running work is never preempted.

All routes use the application's existing access level. The event's global record supplies seasonKey. Filter sets normalize and sort; qualification/playoff semantics use tournamentType, never level ranges. Exact numeric levels remain supported.

Example query:

```json
{"stat":"generic.opr","filters":{"tournamentTypes":["Qualification","Ranking"]},"selectors":{"teamKey":101}}
```

M15 uses its own required params.atUtc; there is no general historical asOf parameter. Most calculators take no parameters. The catalogue schema is authoritative for allowed parameters. It also publishes supportedSelectors; unsupported selectors are rejected instead of silently ignored. Replay timestamps with equivalent timezone offsets normalize to the same UTC query identity.

## Execution and cache

The default is one persistent Node worker and a bounded 64-job waiting queue. Context loading, row validation/reconciliation, replay, matrix solving and simulations occur in workers. Worker read transactions finish before CPU calculations start. The API thread performs input validation, cache/queue operations and response handling.

Fresh cache hits return immediately. Stale hits return the old value and enqueue/join one refresh. Cold misses wait for the worker. Saturated queues reject cold misses with 503; stale results survive overload. Calculation deadlines include queue time and return 504 on a cold timeout. Failed/crashed workers are replaced. Shutdown drains work and pending cache writes within the grace period, then terminates workers.

| Environment variable | Default | Bounds/purpose |
|---|---|---|
| STATS_WORKERS | 1 | Integer 1-16 |
| STATS_QUEUE_CAPACITY | 64 | Integer 0-10000 waiting jobs |
| STATS_TIMEOUT_MS | 30000 | Positive total queue + execution deadline |
| STATS_CACHE_LIMIT | 2000 | Positive per-event maximum rows |
| STATS_WORKER_ENTRY | auto | Optional trusted deployment worker path |

Each event uses a separate <eventKey>.stats.db. SHA-256 addresses canonical normalized queries; inspectable JSON is also stored. Successful entries include duration, snapshot timestamp, latest actually played match, source marker, selected tournaments, formula version, quality/warnings, creation/update/access timestamps. Formula version changes keep the previous good value available until a valid replacement succeeds. Least-recently-accessed retention deletes cache rows only.

The coarse marker contains latest match updatedAtUtc, history ID and action ID across selected tournaments. Covering-index seeks fetch one newest row per selected tournament. Team/ranking/alliance/tournament-only edits can escape this marker; explicit refresh is available. Queue state and order are intentionally memory-only.

## Integrity

Event databases use WAL, synchronous NORMAL and a 5000 ms busy timeout. Revision allocation, base/detail snapshots and indexed high-watermark action association occur in one BEGIN IMMEDIATE transaction. The complete transaction executes in one native SQLite call; this avoids libuv starvation caused by awaiting individual statements while competing writers occupy the native thread pool.

Lifecycle capture logs selected/prestart, start, supported timer mode changes, end, abort, observable results-ready, committed and posted states with clock anchors. Abort is captured before clearing the match key. Timer polling is not logged. Audit delivery uses AbortSignal.timeout(2000) and remains best-effort, without retries or an outbox.

## Verification commands

```text
npm test --workspace @toa-lib/models
npm run build --workspace realtime
npm run build --workspace api
npm run dist --workspace api
npm test --workspace api
npm run build
npm run check-types
docker build --target backend -t ems-fgc2026-stats:verification .
```

API tests expect their workspace working directory and built models/realtime outputs. Packaging tests require the ncc distribution and verify real calculations in both the TypeScript and ncc worker entries. The container contains the emitted worker, native SQLite dependency and API package metadata required by the heartbeat route; the Dockerfile asserts worker presence.

Accepted limitations are best-effort audit delivery, coarse freshness, current rather than frozen historical field settings/qualification rankings, uncertain carrier attribution, model-based rather than sensor-based production estimates, and non-durable queue state. No commit, push or PR is part of this implementation.

The compiled runtime smoke script asserts a real 3668-ball event total, a fresh cache hit, replay for 14 matches, queue inspection/reordering, and a responsive heartbeat. Run from apps/services/api after building:

```text
node ../../../scripts/verify-stats-runtime.mjs
```

The same check in the final container (including stdin/eval worker flag handling):

```text
docker run --rm --entrypoint node -w /workspace/apps/services/api ems-fgc2026-stats:verification --input-type=module --eval "await import('../../../scripts/verify-stats-runtime.mjs')"
```

The backend entrypoint forwards Docker shutdown signals to both services, allowing Fastify to drain its worker pool. Full-container verification checked HTTP 200 from the queue, heartbeat and realtime handshake, then stopped the owned container in 1.861 seconds with a 10-second Docker timeout.

## Final graphics consolidation

The current executable graphics flow and retained compatibility inventory are in
[graphics architecture](graphics-architecture.md) and
[publication operations](playback-publication-operations.md). Playback commands
use the API; realtime publishes one authoritative envelope; show entries use
rundowns; displays share the production transition machine and renderer. Run
`npm run check:graphics-contract` to prevent removed contracts returning.
Final verification is recorded separately from this document's historical test
counts. Tasks 02, 12, 13 and 14 remain excluded and unchanged.
