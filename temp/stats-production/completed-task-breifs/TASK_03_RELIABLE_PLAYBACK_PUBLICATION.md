# Task 03 — Reliable Playback Publication

## Completed

Made port 8080 the sole supported public playback mutation ingress. The API now
configures its process-wide coordinator publisher before controller plugins,
then sends each durable `PlaybackState` through a bounded, authenticated internal
realtime endpoint. Realtime validates complete state, deduplicates by authority
epoch/event/revision, and fans accepted state out using the existing browser
shape without becoming a second playback authority.

Added automatic latest-revision retry with capped exponential backoff,
actionable publication health, and a bounded shutdown drain. Removed duplicate
state broadcasts from the port-8081 compatibility command paths and marked
their successful responses deprecated pending removal in Task 16. Documented
startup, credentials, degraded operation, alerting, routes, and migration.

## Verification

- `npm test --workspace api` — passed: 148 tests.
- `npm run build --workspace realtime` — passed.
- `npm run check-types --workspace ems-web` — passed.
- Publication reliability coverage proves direct and relayed Quick Take,
  exact committed revisions for every mutation type, deduplication and event
  isolation, automatic recovery, plugin-order safety, health, and bounded
  shutdown.
- `git diff --check` — passed with expected line-ending warnings only.

## Handoff

Consumers should call port 8080. Port 8081 command proxies remain temporary
compatibility only; Task 16 owns their removal. Configure the same dedicated
`GRAPHICS_PUBLICATION_TOKEN` in API and realtime and monitor
`GET /graphics/:eventKey/live/publication-health` for pending revisions or
delivery errors.
