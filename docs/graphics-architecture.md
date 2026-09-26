# Graphics playback architecture

The API on port 8080 owns the event-scoped `PlaybackState`: immutable loaded
snapshot, cue readiness, program, staged update, and transition. Producer,
Companion and automation commands enter through its live routes and return
`PlaybackAcknowledgment`. Commands carry request IDs; API GET command forms
remain supported for body-less Companion buttons. Show entries and template
values live in revisioned rundowns; consuming an entry commits with its loaded
playback snapshot in the same transaction.

The coordinator publishes `PlaybackStateEnvelope` v1 to authenticated realtime
ingestion. Realtime validates, deduplicates by event/epoch/revision, and emits
only `graphics:playback-state:v1`. Subscription hydration fetches that exact
envelope from the API. Realtime has delivery cursors and no playback store or
playback command ingress. Browsers keep one event-scoped authoritative store;
disconnect preserves its last state and reconnect requests complete hydration.

PGM and the producer monitor render the program graphic through the shared
composition and deterministic transition machine. Its React adapter schedules
the next machine deadline. PVW derives the next spec from the loaded snapshot,
one item after the program's position when its snapshot matches; otherwise it
uses the loaded cursor. A refresh recalculates the graphic already live at a
destination without moving it, so the staged copy carries that graphic's show
coordinates and a push-update promotes them intact; an ad-hoc graphic that never
had a position keeps none. It calculates that spec off-air through the same frame
preparation entry point. PVW calculation and preflight never write playback.
Preview replay is an ephemeral realtime signal, affecting only PVW animation.

## Retained compatibility and owners

| Surface | Verified owner / protocol | Tests | Retirement condition |
| --- | --- | --- | --- |
| Old queue database import | EMS operations: existing `graphics_queue` JSON is imported once into `producer-show`, with an atomic migration marker; original rows remain recovery data. Fresh databases never create this table. | `graphics-show-consolidation.test.ts`, `graphics-show.test.ts` | Permanent supported database import; review at the next database schema retirement. No runtime queue API remains. |
| Timeline schema migration | EMS operations: persisted older timeline JSON and revisions. | `graphics-timeline.test.ts`, `graphics-contracts.test.ts` | Permanent supported data migration. |
| Presentation metadata and frame bridges | EMS models/web: producer metadata and validated frames with series/rows. All shipped catalogue IDs prepare through explicit semantic registrations; current semantic frames also publish series/row bridges consumed by shared renderers. | `presentation.test.ts`, `presentation-registry.test.ts`, broadcast renderer/formatter tests | Supported current frame representation; review when bridge fields are retired with a tested persisted-frame migration. No deprecated preparation adapter remains. |
| API GET command aliases | Companion/button-box deployments confirmed by operator to use port 8080. Same coordinator and acknowledgments as POST. | `graphics-playback-routes.test.ts`, `graphics-quick-cue.test.ts` | Supported public protocol; no deprecation scheduled. |
| Publication JWT-secret fallback | EMS API/realtime existing deployment configuration; shared service credential fallback only. | Publication ingest tests and runtime smoke | Dedicated publication token is preferred; review when deployment credential compatibility is retired. |
| Disabled graphics service | EMS subfield/match-only deployments: `DISABLE_GRAPHICS` omits graphics room, read/replay and ingest endpoints. | Runtime smoke | Supported deployment mode. |

On 2026-09-15 the operator confirmed deployed consumers use port 8080. Legacy
socket commands/state, realtime command proxies, and queue read/alias routes have
been removed. Historical task/audit documents describe prior generations only.

## Validation and accepted limits

Run all workspace tests, `npm run selftest:transitions --workspace ems-web`,
`npm run check-types`, `npm run build`, `npm run dist --workspace api`, and
`npm run check:graphics-contract`. The transition script runs the production
machine and React adapter tests; it no longer depends on ignored temp files.

`npm run verify:graphics-system` is the full-system check: it starts the real
built API, realtime service and web bundle against isolated two-event fixture
databases and drives login, load/take, refresh/push, Quick Take, timed Clear,
reconnect hydration, PGM/PVW rendering in a headless browser, event isolation,
and the disabled-subfield mode.

The built bundle derives its API and realtime origins from its own hostname with
the production ports 8080 and 8081, so the browser leg must see those exact
ports. The services therefore bind high ports (18080/18081/14178/18082) on
127.0.0.1, and the page is served from the loopback address 127.0.0.2 whose 8080
and 8081 are forwarded to them. A specific-address bind takes precedence over any
wildcard listener already on 8080, so a running editor, tunnel or dev server is
neither displaced nor required to stop. Override with `EMS_SMOKE_API_PORT`,
`EMS_SMOKE_REALTIME_PORT`, `EMS_SMOKE_WEB_PORT`, `EMS_SMOKE_DISABLED_PORT` and
`EMS_SMOKE_BROWSER_HOST`. It requires `npm run build` first and a Chromium-family
browser (`EMS_LAYOUT_BROWSER` overrides the default Edge path).

Tasks 02, 12, 13 and 14 are explicitly excluded from this removal. Existing login
and socket authentication bypass behavior, best-effort audit/history capture,
and coarse browsing cache freshness remain as implemented. Authoritative
preparation still awaits fresh stats. Verification records these boundaries;
it does not imply those excluded tasks were implemented.
