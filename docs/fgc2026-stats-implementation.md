# FGC2026 production statistics implementation

Branch: `feat/fgc2026-production-stats`. Base: PR #281, `64e37a0a6a9c16d8e5d66affa53d70211f45b266`, verified against the GitHub PR head and local `pr-281`. No commits, pushes, PRs, or old-event audit migrations were made. The pre-existing .gitignore change and ignored temp files are preserved.

All 232 catalogue entries are registered with descriptive public slugs, catalogue metadata, strict parameter and result schemas, and formula fixtures. Portable mathematical engines remain under generic; registrations consuming season rules remain under fgc2026, including the relevant Section A entries.

| Section | Implementations | Golden fixtures |
|---|---:|---:|
| A | 42 / 42 | 42 / 42 |
| B | 22 / 22 | 22 / 22 |
| C | 22 / 22 | 22 / 22 |
| D | 9 / 9 | 9 / 9 |
| E | 13 / 13 | 13 / 13 |
| F | 17 / 17 | 17 / 17 |
| G | 14 / 14 | 14 / 14 |
| H | 14 / 14 | 14 / 14 |
| I | 10 / 10 | 10 / 10 |
| J | 15 / 15 | 15 / 15 |
| K | 13 / 13 | 13 / 13 |
| L | 14 / 14 | 14 / 14 |
| M | 27 / 27 | 27 / 27 |

The [contract suite](../libs/models/src/seasons/stats/tests/contracts.test.ts) checks every registration against [golden.json](../libs/models/src/seasons/stats/tests/golden.json), deterministic finite JSON, empty events, missing teams, partial details, missing historical fields, absent participants and absent timestamps. [Independent formula fixtures](../libs/models/src/seasons/stats/tests/formulas.test.ts) additionally verify score identities, numerical constants, ranking/card rules, carrier prerequisites, chronological predictions, live reference data and tournament-separated simulations.

Implementation and verification span the worker pool/queue, per-event statistics database, Fastify routes, immutable worker snapshots, replay cleanup, lifecycle anchors, WAL/busy timeout, atomic revision association and TypeScript/ncc/Docker worker packaging. See [operations](fgc2026-stats-operations.md) and [formulation sources, constants and limitations](fgc2026-stats-formulas.md).

## Prerequisites and truthful outcomes

- M22 is unavailable for current api/null/unknown/legacy-only source history. Issue #292 must capture distinguishable referee and administrative origins before override rates are meaningful.
- Audit and timing calculators return unavailable or explicit nullable measurements when required action events, paired revision snapshots, timestamps or lifecycle data are absent. Nominal clock fallbacks carry best-effort warnings. Referee entries are not physical sensor observations.
- B17/B18 require an observed field LED ratio. Current global settings carry a historical-provenance warning.
- D4/D6 require a uniquely inferable carrier. K2/K6 require four matches, K11 two finals, and K3/K8/K9 the relevant membership and qualification ranking data. Current qualification rankings carry a warning because qualification-close snapshots do not exist.
- K12 provides a penalty-free bound and cannot certify an unconditional clinch because penalties are unbounded. K13 is a deterministic empirical bootstrap within each tournament.
- Unknown team metadata, absent countries, zero denominators, unidentifiable model fits and inadequate samples are explicit missing/insufficient or best-effort outcomes. They never become fabricated zero measurements.

## Verification results

- Models: 21 tests passed, including all 232 golden fixtures and registry-wide contracts.
- API: 12 tests passed, including original match-history regression, event/tournament filtering, queue endpoints/reordering, worker crash/timeout/replacement, cache freshness/version/retention, shutdown and covering-index checks.
- Concurrency: 360 input writes from 12 connections across three fields, alongside 24 atomic revisions and worker/cache refreshes. Final local run: p95 49.0 ms, maximum 203.6 ms; no missing/partial revisions.
- Heartbeat: maximum 0.8 ms while a worker was deliberately CPU-bound. Final Docker replay smoke: maximum 2.46 ms, below its 500 ms budget.
- Full workspace build and configured type checks passed. API/realtime builds, ncc server/worker bundles, and real TypeScript/ncc worker calculations passed.
- Docker backend build and native SQLite/compiled-worker runtime smoke passed (image b06e7e27510f). The reproducible smoke script verified 3668 contained balls, 14 replay curves, a fresh cache hit and queue operations. Full backend startup returned HTTP 200 for the statistics queue, heartbeat and realtime handshake. Docker stop shut down both services in 1.861 seconds, within the 10-second deadline. Verification containers were removed.
- Full backend startup exposed an existing packaging omission: the heartbeat controller reads the API package.json. The Docker image now includes it.
- git diff --check passed. No source data was deleted, and no commit/push/PR was made.

Follow-up: issue #292 source provenance and calibration against real FGC2026 event data. Accepted limits remain coarse freshness, best-effort audit delivery, current settings/qualification rankings, uncertain carrier attribution, bounded statistical simulations and an in-memory queue.

## Changed files

- libs/models/src/seasons/stats/: catalogue, registry, typed parameters/results, portable engines, FGC2026 calculators, country reference data, replay utilities and all formula/contract fixtures.
- libs/models/src/seasons/FGC26_IgnitingInnovation.ts and libs/models/src/base/MatchTimer.ts: ranking/card correctness and lifecycle-listener cleanup.
- apps/services/api/src/controllers/Stats.ts and apps/services/api/src/stats/: endpoints, worker pool, queue, source snapshots and separate statistics cache.
- apps/services/api/src/controllers/Match.ts, apps/services/api/src/db/EventDatabase.ts and apps/services/api/sql/create_event.sql: WAL/busy timeout, atomic revisions, action high-watermark association and covering indexes.
- apps/services/realtime/src/rooms/Match.ts: lifecycle/clock audit anchors and bounded best-effort fetch.
- apps/services/api/src/Server.ts: route registration, source-backup exclusion for statistics queries and graceful shutdown.
- apps/services/api/src/tests/: worker controls, fixtures, API/cache/queue/concurrency tests and TypeScript/ncc packaging checks.
- libs/models/package.json, apps/services/api/package.json and package-lock.json: model test runner, scripts/exports, SVD dependency and separate ncc worker build.
- Dockerfile, scripts/backend_entrypoint.sh and scripts/verify-stats-runtime.mjs: deployable worker/package metadata, signal forwarding and repeatable runtime verification.
- docs/fgc2026-stats-implementation.md, docs/fgc2026-stats-formulas.md and docs/fgc2026-stats-operations.md: complete catalogue checklist, model sources/constants and operational behavior.

The pre-existing .gitignore modification belongs to the user and was preserved.

## Catalogue checklist

Every row below is implemented. The fixture key is the same catalogue ID in golden.json; shared contract checks run for each row.

| ID | Public slug | Implementation | Verification |
|---|---|---|---|
| A1 | `generic.opr` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A1`; contract/partial-data checks |
| A2 | `fgc2026.suppression-opr` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A2`; contract/partial-data checks |
| A3 | `fgc2026.pre-multiplier-opr` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A3`; contract/partial-data checks |
| A4 | `fgc2026.climb-opr` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A4`; contract/partial-data checks |
| A5 | `fgc2026.extinguisher-opr` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A5`; contract/partial-data checks |
| A6 | `generic.dpr` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A6`; contract/partial-data checks |
| A7 | `generic.ccwm` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A7`; contract/partial-data checks |
| A8 | `generic.adjusted-ridge-opr` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A8`; contract/partial-data checks |
| A9 | `generic.iopr` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A9`; contract/partial-data checks |
| A10 | `generic.epa` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A10`; contract/partial-data checks |
| A11 | `fgc2026.component-epa` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A11`; contract/partial-data checks |
| A12 | `generic.normalized-unitless-epa` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A12`; contract/partial-data checks |
| A13 | `generic.elo` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A13`; contract/partial-data checks |
| A14 | `generic.elo-peak-elo-delta` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A14`; contract/partial-data checks |
| A15 | `generic.trueskill-bradley-terry` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A15`; contract/partial-data checks |
| A16 | `generic.win-probability-pre-match` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A16`; contract/partial-data checks |
| A17 | `fgc2026.predicted-score` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A17`; contract/partial-data checks |
| A18 | `generic.predicted-margin` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A18`; contract/partial-data checks |
| A19 | `generic.predicted-score-distribution` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A19`; contract/partial-data checks |
| A20 | `generic.model-brier-score` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A20`; contract/partial-data checks |
| A21 | `generic.upset-index` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A21`; contract/partial-data checks |
| A22 | `generic.consistency` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A22`; contract/partial-data checks |
| A23 | `generic.ceiling-floor` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A23`; contract/partial-data checks |
| A24 | `generic.strength-of-schedule-partners` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A24`; contract/partial-data checks |
| A25 | `generic.strength-of-schedule-opponents` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A25`; contract/partial-data checks |
| A26 | `fgc2026.luck-rating` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A26`; contract/partial-data checks |
| A27 | `generic.w-l-t` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A27`; contract/partial-data checks |
| A28 | `generic.win` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A28`; contract/partial-data checks |
| A29 | `fgc2026.ranking-score-official` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A29`; contract/partial-data checks |
| A30 | `fgc2026.rank-rank-change` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A30`; contract/partial-data checks |
| A31 | `fgc2026.rank-volatility` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A31`; contract/partial-data checks |
| A32 | `fgc2026.highest-single-match-score-tb1` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A32`; contract/partial-data checks |
| A33 | `fgc2026.cumulative-climb-points-tb2` | [fgc2026/portable-game-models.ts](../libs/models/src/seasons/stats/fgc2026/portable-game-models.ts) | Golden `A33`; contract/partial-data checks |
| A34 | `generic.average-median-score` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A34`; contract/partial-data checks |
| A35 | `generic.score-vs-field-average` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A35`; contract/partial-data checks |
| A36 | `generic.matches-played-surrogate-count` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A36`; contract/partial-data checks |
| A37 | `generic.unique-partners-count` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A37`; contract/partial-data checks |
| A38 | `generic.head-to-head-record` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A38`; contract/partial-data checks |
| A39 | `generic.percentile-rank` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A39`; contract/partial-data checks |
| A40 | `generic.form-momentum` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A40`; contract/partial-data checks |
| A41 | `generic.trend-slope` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A41`; contract/partial-data checks |
| A42 | `generic.counterfactual-pairing` | [generic/index.ts](../libs/models/src/seasons/stats/generic/index.ts) | Golden `A42`; contract/partial-data checks |
| B1 | `fgc2026.suppression-balls` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B1`; contract/partial-data checks |
| B2 | `fgc2026.extinguisher-balls` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B2`; contract/partial-data checks |
| B3 | `fgc2026.total-contained` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B3`; contract/partial-data checks |
| B4 | `fgc2026.containment-rate-field-clear` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B4`; contract/partial-data checks |
| B5 | `fgc2026.unscored-wildfire` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B5`; contract/partial-data checks |
| B6 | `fgc2026.suppression-share` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B6`; contract/partial-data checks |
| B7 | `fgc2026.extinguisher-share` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B7`; contract/partial-data checks |
| B8 | `fgc2026.suppression-differential` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B8`; contract/partial-data checks |
| B9 | `fgc2026.balls-per-second-match` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B9`; contract/partial-data checks |
| B10 | `fgc2026.balls-per-second-alliance` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B10`; contract/partial-data checks |
| B11 | `fgc2026.peak-scoring-window` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B11`; contract/partial-data checks |
| B12 | `fgc2026.time-to-first-ball` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B12`; contract/partial-data checks |
| B13 | `fgc2026.milestone-splits` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B13`; contract/partial-data checks |
| B14 | `fgc2026.scoring-curve-shape` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B14`; contract/partial-data checks |
| B15 | `fgc2026.longest-drought` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B15`; contract/partial-data checks |
| B16 | `fgc2026.extinguisher-entry-attribution` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B16`; contract/partial-data checks |
| B17 | `fgc2026.led-ball-divergence` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B17`; contract/partial-data checks |
| B18 | `fgc2026.score-granularity` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B18`; contract/partial-data checks |
| B19 | `fgc2026.stepped-vs-typed-entry` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B19`; contract/partial-data checks |
| B20 | `fgc2026.provisional-vs-final-delta` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B20`; contract/partial-data checks |
| B21 | `fgc2026.event-balls-contained` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B21`; contract/partial-data checks |
| B22 | `fgc2026.event-containment-rate` | [fgc2026/wildfire.ts](../libs/models/src/seasons/stats/fgc2026/wildfire.ts) | Golden `B22`; contract/partial-data checks |
| C1 | `fgc2026.brace-state-per-robot` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C1`; contract/partial-data checks |
| C2 | `fgc2026.climb-multiplier` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C2`; contract/partial-data checks |
| C3 | `fgc2026.multiplier-efficiency` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C3`; contract/partial-data checks |
| C4 | `fgc2026.zone-3-rate-team` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C4`; contract/partial-data checks |
| C5 | `fgc2026.zone-distribution-team` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C5`; contract/partial-data checks |
| C6 | `fgc2026.any-climb-rate` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C6`; contract/partial-data checks |
| C7 | `fgc2026.off-ground-rate` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C7`; contract/partial-data checks |
| C8 | `fgc2026.best-zone-ever` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C8`; contract/partial-data checks |
| C9 | `fgc2026.perfect-alliance-climb` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C9`; contract/partial-data checks |
| C10 | `fgc2026.best-multiplier-of-event` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C10`; contract/partial-data checks |
| C11 | `fgc2026.marginal-climb-value` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C11`; contract/partial-data checks |
| C12 | `fgc2026.most-valuable-single-climb` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C12`; contract/partial-data checks |
| C13 | `fgc2026.points-forgone-by-not-climbing` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C13`; contract/partial-data checks |
| C14 | `fgc2026.endgame-swing` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C14`; contract/partial-data checks |
| C15 | `fgc2026.alliance-climb-points-added` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C15`; contract/partial-data checks |
| C16 | `fgc2026.brace-log-time` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C16`; contract/partial-data checks |
| C17 | `fgc2026.last-brace-entry-vs-buzzer` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C17`; contract/partial-data checks |
| C18 | `fgc2026.first-brace-logged-in-match` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C18`; contract/partial-data checks |
| C19 | `fgc2026.zone-upgrade-path` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C19`; contract/partial-data checks |
| C20 | `fgc2026.brace-call-revisions` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C20`; contract/partial-data checks |
| C21 | `fgc2026.event-zone-3-count` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C21`; contract/partial-data checks |
| C22 | `fgc2026.zone-3-rate-over-time` | [fgc2026/climb.ts](../libs/models/src/seasons/stats/fgc2026/climb.ts) | Golden `C22`; contract/partial-data checks |
| D1 | `fgc2026.partner-climbs-in-match` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D1`; contract/partial-data checks |
| D2 | `fgc2026.partner-climb-points` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D2`; contract/partial-data checks |
| D3 | `fgc2026.carried-rate-team` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D3`; contract/partial-data checks |
| D4 | `fgc2026.carrier-rate-team` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D4`; contract/partial-data checks |
| D5 | `fgc2026.double-carry` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D5`; contract/partial-data checks |
| D6 | `fgc2026.carry-z3-combo` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D6`; contract/partial-data checks |
| D7 | `fgc2026.partner-climb-share-of-score` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D7`; contract/partial-data checks |
| D8 | `fgc2026.lift-specialist` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D8`; contract/partial-data checks |
| D9 | `fgc2026.event-partner-climb-total` | [fgc2026/partner-climb.ts](../libs/models/src/seasons/stats/fgc2026/partner-climb.ts) | Golden `D9`; contract/partial-data checks |
| E1 | `fgc2026.coopertition-bonus` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E1`; contract/partial-data checks |
| E2 | `fgc2026.global-zone-3-count` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E2`; contract/partial-data checks |
| E3 | `fgc2026.coopertition-rate` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E3`; contract/partial-data checks |
| E4 | `fgc2026.perfect-coopertition-rate` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E4`; contract/partial-data checks |
| E5 | `fgc2026.near-miss-rate` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E5`; contract/partial-data checks |
| E6 | `fgc2026.shared-points` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E6`; contract/partial-data checks |
| E7 | `fgc2026.shared-points-share` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E7`; contract/partial-data checks |
| E8 | `fgc2026.independent-score` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E8`; contract/partial-data checks |
| E9 | `fgc2026.team-cooperative-index` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E9`; contract/partial-data checks |
| E10 | `fgc2026.coopertition-contributed` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E10`; contract/partial-data checks |
| E11 | `fgc2026.coopertition-denied` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E11`; contract/partial-data checks |
| E12 | `fgc2026.cross-alliance-assist` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E12`; contract/partial-data checks |
| E13 | `fgc2026.event-global-alliance-total` | [fgc2026/coopertition.ts](../libs/models/src/seasons/stats/fgc2026/coopertition.ts) | Golden `E13`; contract/partial-data checks |
| F1 | `fgc2026.full-breakdown` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F1`; contract/partial-data checks |
| F2 | `fgc2026.from-each-source` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F2`; contract/partial-data checks |
| F3 | `fgc2026.pre-multiplier-score` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F3`; contract/partial-data checks |
| F4 | `fgc2026.multiplier-added-points` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F4`; contract/partial-data checks |
| F5 | `fgc2026.counterfactual-no-climb` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F5`; contract/partial-data checks |
| F6 | `fgc2026.counterfactual-no-coop` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F6`; contract/partial-data checks |
| F7 | `fgc2026.highest-lowest-score` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F7`; contract/partial-data checks |
| F8 | `fgc2026.score-distribution` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F8`; contract/partial-data checks |
| F9 | `fgc2026.margin-distribution` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F9`; contract/partial-data checks |
| F10 | `fgc2026.tie-count` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F10`; contract/partial-data checks |
| F11 | `fgc2026.closest-widest-match` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F11`; contract/partial-data checks |
| F12 | `fgc2026.score-inflation` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F12`; contract/partial-data checks |
| F13 | `fgc2026.record-progression` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F13`; contract/partial-data checks |
| F14 | `fgc2026.theoretical-max-score` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F14`; contract/partial-data checks |
| F15 | `fgc2026.of-ceiling-achieved` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F15`; contract/partial-data checks |
| F16 | `fgc2026.points-per-ball` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F16`; contract/partial-data checks |
| F17 | `fgc2026.ceiling-rounding-gain` | [fgc2026/score-composition.ts](../libs/models/src/seasons/stats/fgc2026/score-composition.ts) | Golden `F17`; contract/partial-data checks |
| G1 | `fgc2026.minor-major-foul-counts` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G1`; contract/partial-data checks |
| G2 | `fgc2026.foul-points-awarded` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G2`; contract/partial-data checks |
| G3 | `fgc2026.foul-points-share` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G3`; contract/partial-data checks |
| G4 | `fgc2026.matches-decided-by-fouls` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G4`; contract/partial-data checks |
| G5 | `fgc2026.foul-rate-team` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G5`; contract/partial-data checks |
| G6 | `fgc2026.yellow-red-white-card-counts` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G6`; contract/partial-data checks |
| G7 | `fgc2026.teams-carrying-a-card` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G7`; contract/partial-data checks |
| G8 | `fgc2026.cards-by-phase` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G8`; contract/partial-data checks |
| G9 | `fgc2026.white-card-rate` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G9`; contract/partial-data checks |
| G10 | `fgc2026.red-card-ranking-impact` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G10`; contract/partial-data checks |
| G11 | `fgc2026.dq-count` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G11`; contract/partial-data checks |
| G12 | `fgc2026.no-show-count` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G12`; contract/partial-data checks |
| G13 | `fgc2026.card-issue-timing` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G13`; contract/partial-data checks |
| G14 | `fgc2026.foul-corrections` | [fgc2026/penalties.ts](../libs/models/src/seasons/stats/fgc2026/penalties.ts) | Golden `G14`; contract/partial-data checks |
| H1 | `fgc2026.live-score-velocity` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H1`; contract/partial-data checks |
| H2 | `fgc2026.projected-final-score` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H2`; contract/partial-data checks |
| H3 | `fgc2026.live-win-probability` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H3`; contract/partial-data checks |
| H4 | `fgc2026.time-since-last-score` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H4`; contract/partial-data checks |
| H5 | `fgc2026.scoring-run` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H5`; contract/partial-data checks |
| H6 | `fgc2026.per-30-s-segment-scoring` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H6`; contract/partial-data checks |
| H7 | `fgc2026.balls-needed-to-take-the-lead` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H7`; contract/partial-data checks |
| H8 | `fgc2026.balls-needed-for-a-record` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H8`; contract/partial-data checks |
| H9 | `fgc2026.robots-needed-for-coopertition` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H9`; contract/partial-data checks |
| H10 | `fgc2026.coopertition-value-at-stake` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H10`; contract/partial-data checks |
| H11 | `fgc2026.balls-needed-to-raise-ranking-score` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H11`; contract/partial-data checks |
| H12 | `fgc2026.live-rank-if-ended-now` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H12`; contract/partial-data checks |
| H13 | `fgc2026.climb-decision-math` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H13`; contract/partial-data checks |
| H14 | `fgc2026.endgame-projection-at-t-30` | [fgc2026/live.ts](../libs/models/src/seasons/stats/fgc2026/live.ts) | Golden `H14`; contract/partial-data checks |
| I1 | `fgc2026.cycle-time` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I1`; contract/partial-data checks |
| I2 | `fgc2026.rolling-avg-cycle-time` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I2`; contract/partial-data checks |
| I3 | `fgc2026.schedule-adherence` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I3`; contract/partial-data checks |
| I4 | `fgc2026.cumulative-drift` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I4`; contract/partial-data checks |
| I5 | `fgc2026.prestart-to-start` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I5`; contract/partial-data checks |
| I6 | `fgc2026.field-turnaround` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I6`; contract/partial-data checks |
| I7 | `fgc2026.matches-played-remaining` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I7`; contract/partial-data checks |
| I8 | `fgc2026.per-field-score-bias` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I8`; contract/partial-data checks |
| I9 | `fgc2026.results-commit-latency` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I9`; contract/partial-data checks |
| I10 | `fgc2026.event-ball-throughput` | [fgc2026/tournament-operations.ts](../libs/models/src/seasons/stats/fgc2026/tournament-operations.ts) | Golden `I10`; contract/partial-data checks |
| J1 | `fgc2026.country-flag` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J1`; contract/partial-data checks |
| J2 | `fgc2026.robot-name` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J2`; contract/partial-data checks |
| J3 | `fgc2026.rookie-status` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J3`; contract/partial-data checks |
| J4 | `fgc2026.best-rookie` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J4`; contract/partial-data checks |
| J5 | `fgc2026.best-debut` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J5`; contract/partial-data checks |
| J6 | `fgc2026.regional-aggregate` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J6`; contract/partial-data checks |
| J7 | `fgc2026.country-head-to-head` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J7`; contract/partial-data checks |
| J8 | `fgc2026.never-climbed-club` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J8`; contract/partial-data checks |
| J9 | `fgc2026.100-climb-rate` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J9`; contract/partial-data checks |
| J10 | `fgc2026.most-improved` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J10`; contract/partial-data checks |
| J11 | `fgc2026.most-frequent-partner` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J11`; contract/partial-data checks |
| J12 | `fgc2026.never-played-together` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J12`; contract/partial-data checks |
| J13 | `fgc2026.best-worst-match` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J13`; contract/partial-data checks |
| J14 | `fgc2026.winning-alliance-appearances` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J14`; contract/partial-data checks |
| J15 | `fgc2026.geographic-superlatives` | [fgc2026/team-interest.ts](../libs/models/src/seasons/stats/fgc2026/team-interest.ts) | Golden `J15`; contract/partial-data checks |
| K1 | `fgc2026.alliance-cumulative-score` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K1`; contract/partial-data checks |
| K2 | `fgc2026.alliance-average` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K2`; contract/partial-data checks |
| K3 | `fgc2026.alliance-composition-strength` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K3`; contract/partial-data checks |
| K4 | `fgc2026.seed-vs-performance` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K4`; contract/partial-data checks |
| K5 | `fgc2026.rotation-pattern` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K5`; contract/partial-data checks |
| K6 | `fgc2026.sit-out-count` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K6`; contract/partial-data checks |
| K7 | `fgc2026.random-draw-impact` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K7`; contract/partial-data checks |
| K8 | `fgc2026.captain-performance` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K8`; contract/partial-data checks |
| K9 | `fgc2026.third-slot-value` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K9`; contract/partial-data checks |
| K10 | `fgc2026.round-robin-h2h` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K10`; contract/partial-data checks |
| K11 | `fgc2026.finals-sum` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K11`; contract/partial-data checks |
| K12 | `fgc2026.clinch-elimination-math` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K12`; contract/partial-data checks |
| K13 | `fgc2026.path-to-victory-scenarios` | [fgc2026/playoffs.ts](../libs/models/src/seasons/stats/fgc2026/playoffs.ts) | Golden `K13`; contract/partial-data checks |
| L1 | `fgc2026.margin-decomposition` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L1`; contract/partial-data checks |
| L2 | `fgc2026.the-shared-terms-fact` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L2`; contract/partial-data checks |
| L3 | `fgc2026.did-the-multiplier-flip-it` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L3`; contract/partial-data checks |
| L4 | `fgc2026.did-partner-climb-flip-it` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L4`; contract/partial-data checks |
| L5 | `fgc2026.win-rate-by-multiplier` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L5`; contract/partial-data checks |
| L6 | `fgc2026.win-rate-by-suppression-differential` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L6`; contract/partial-data checks |
| L7 | `fgc2026.climb-vs-balls-tradeoff` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L7`; contract/partial-data checks |
| L8 | `fgc2026.current-drop-match` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L8`; contract/partial-data checks |
| L9 | `fgc2026.next-drop-threshold` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L9`; contract/partial-data checks |
| L10 | `fgc2026.ranking-sensitivity` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L10`; contract/partial-data checks |
| L11 | `fgc2026.bubble-watch` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L11`; contract/partial-data checks |
| L12 | `fgc2026.partner-luck-spread` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L12`; contract/partial-data checks |
| L13 | `fgc2026.correlation-matrix` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L13`; contract/partial-data checks |
| L14 | `fgc2026.what-decided-each-match` | [fgc2026/cross-cutting.ts](../libs/models/src/seasons/stats/fgc2026/cross-cutting.ts) | Golden `L14`; contract/partial-data checks |
| M1 | `fgc2026.revisions-per-match` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M1`; contract/partial-data checks |
| M2 | `fgc2026.post-buzzer-revisions` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M2`; contract/partial-data checks |
| M3 | `fgc2026.score-correction-magnitude` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M3`; contract/partial-data checks |
| M4 | `fgc2026.net-score-correction` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M4`; contract/partial-data checks |
| M5 | `fgc2026.most-corrected-field` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M5`; contract/partial-data checks |
| M6 | `fgc2026.time-to-final-score` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M6`; contract/partial-data checks |
| M7 | `fgc2026.scoring-settle-time` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M7`; contract/partial-data checks |
| M8 | `fgc2026.entries-per-referee` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M8`; contract/partial-data checks |
| M9 | `fgc2026.referee-press-cadence` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M9`; contract/partial-data checks |
| M10 | `fgc2026.average-edit-size` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M10`; contract/partial-data checks |
| M11 | `fgc2026.referee-back-out-rate` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M11`; contract/partial-data checks |
| M12 | `fgc2026.action-snapshot-reconciliation` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M12`; contract/partial-data checks |
| M13 | `fgc2026.unpersisted-action-count` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M13`; contract/partial-data checks |
| M14 | `fgc2026.realtime-api-latency` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M14`; contract/partial-data checks |
| M15 | `fgc2026.match-state-at-time-t` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M15`; contract/partial-data checks |
| M16 | `fgc2026.score-at-any-second-curve` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M16`; contract/partial-data checks |
| M17 | `fgc2026.live-margin-curve` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M17`; contract/partial-data checks |
| M18 | `fgc2026.lead-changes-per-match` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M18`; contract/partial-data checks |
| M19 | `fgc2026.largest-deficit-overcome` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M19`; contract/partial-data checks |
| M20 | `fgc2026.extinguisher-write-contention` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M20`; contract/partial-data checks |
| M21 | `fgc2026.referee-workload-by-field` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M21`; contract/partial-data checks |
| M22 | `fgc2026.head-ref-override-rate` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M22`; contract/partial-data checks |
| M23 | `fgc2026.which-ref-called-which-match` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M23`; contract/partial-data checks |
| M24 | `fgc2026.contested-match-index` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M24`; contract/partial-data checks |
| M25 | `fgc2026.event-wide-correction-rate` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M25`; contract/partial-data checks |
| M26 | `fgc2026.coopertition-flip-timing` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M26`; contract/partial-data checks |
| M27 | `fgc2026.multiplier-trajectory` | [fgc2026/audit-trail.ts](../libs/models/src/seasons/stats/fgc2026/audit-trail.ts) | Golden `M27`; contract/partial-data checks |
