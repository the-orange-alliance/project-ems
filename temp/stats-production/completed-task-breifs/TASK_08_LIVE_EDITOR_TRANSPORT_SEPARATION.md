# Task 08 — Separate Live Editor Drafts from Transport Snapshots

## Completed

The Live tab's item list is now unambiguously a **draft**, and the transport is
unambiguously the **loaded snapshot**. Nothing on the producer page can show one
while meaning the other.

`live-timeline-sync.ts` is the new, pure, React-free home of that boundary. It has
two functions:

- `readLoadedRunningOrder(loaded)` projects the authoritative
  `LoadedGraphicsSnapshot` into the read-only running order the transport surface
  renders from — position, item index, timeline id, title, playhead, plus the
  timeline's name and **the revision as loaded**.
- `describeDraftSync(...)` answers the one question that used to be assumed:
  *may this draft be decorated with transport state at all?* It is deliberately
  conservative. `describesLoaded` is true only when the buffer is clean **and**
  the saved revision the draft is staged on equals the snapshot's loaded revision
  **and** every draft row's id matches the snapshot's row at the same position.
  Anything else returns one of `unsaved-edits`, `saved-not-reloaded`, `diverged`,
  `save-conflict` or `no-timeline`, each with operator-facing text naming both
  revisions.

F21 itself was the positional highlight. `TimelineItemsPanel` on the Live tab was
handed `liveIndex = currentLoadedItem.itemIndex` — an index into the **snapshot** —
and rendered it against the **draft** rows. Deleting or reordering a row above the
playhead slid the "LIVE" highlight onto a graphic the transport would never play,
and the same happened to the preflight readiness badges, which are computed from
snapshot specs and keyed by id. Both are now withheld entirely unless
`liveSync.describesLoaded` holds; in their place the tab shows an unmistakable
banner and the authoritative list.

That authoritative list is `loaded-running-order.tsx`: a read-only rendering of the
snapshot rows with ON AIR / LOADED / NEXT tags, sitting directly above the draft it
must not be confused with. The transport box also gained a `LOADED` line — timeline
name, item N of M, title, revision — which is present on **every** tab, so the
target of the next Prev/Go press is named on screen whether or not the producer has
the Live tab open. When the draft disagrees, a tag in that same box says so.

**Save and reload are now different commands.** Saving the live timeline used to
chain a `live/load` of it. That silent reload was a transport command wearing an
editor's clothes: `load` rebuilds the snapshot from item 0 and re-prepares the cue,
so fixing a typo on item 7 mid-show rewound the running order to item 1 — and when
the transport was running a **rundown** snapshot spanning several timelines, it
replaced that entire running order with the one timeline being edited. Save now
writes the draft and nothing else, and says so in its snackbar. Putting the saved
version on the transport is `handleReloadToTransport`: explicit, behind a
Popconfirm that states the rewind (and, while the buffer is dirty, that unsaved
edits are not included), carrying the snapshot's own `values` forward so already
resolved template bindings are not dropped, and **refused outright** for a rundown
snapshot with the reason given on the button.

A failed reload is a first-class visible state, not a vanished snackbar: the error
stays on the banner with the reassurance that the transport kept what it had and
the draft is untouched, and it clears itself when a new snapshot id arrives (any
successful load, including someone else's) or the event changes.

Remote revision conflicts keep both versions. `useTimelineEditor.save()` no longer
lets a 409 fall through as a generic error: it sets `saveConflict`, leaves the
staged buffer completely intact (nothing was written server-side), and re-reads the
timelines cache **on the failure path only** so the revision that actually won is
what the banner names back to the operator. Pressing Save again is then an explicit
"mine wins" with both revisions already on screen; `revert()` takes theirs. The hook
also exposes `remoteRevision`, which is what makes "saved but not reloaded"
detectable at all.

`isRevisionConflict` moved into `revision-conflict.ts` and is shared with
`useShowRundown`, and it now also recognises `HttpError.status === 409` (the station
API's CRUD shape) alongside the relay's `code`/`message` envelope — the timeline
PATCH goes through the former, which the old copy did not match.

## Decisions worth knowing

- **Transport buttons were not gated on dirtiness.** The finding allowed either
  gating or an explicit save-and-reload path; taking transport control away from an
  operator mid-show because of a stray keystroke is the worse failure. Instead the
  target is stated authoritatively and continuously (the LOADED line and the loaded
  running order list), and the draft is stripped of any claim to describe it. The
  enabled actions therefore always operate on the visibly identified target.
- The Editor tab is unchanged and still never renders live state.
- Cue's target, the variable modal's variables and the ACTIVE/CUE bar were already
  snapshot-derived (Tasks 04/05) and stayed that way.

## Tests

- `live-timeline-sync.test.ts` (14): snapshot projection; reorder/delete/insert
  before the playhead; in-place title/spec edits; saved-not-reloaded; diverged;
  save conflict; drift without a revision change; unloaded transport; the rundown
  reload refusal; and that only the edited timeline's rows are compared.
- `use-timeline-editor.test.tsx` (7): the saved revision it stages on; the save
  reaching exactly one endpoint; partial patches for a binding edit; a 409 keeping
  the draft and re-reading the winner once; non-conflict failures not being
  mislabelled; and the conflict clearing on revert and on a later commit.
- `graphics-controller.test.tsx` (+10): the LOADED line naming the snapshot target
  before any tab is opened; a clean current draft carrying the live position;
  liveIndex **and** readiness withheld for each of reorder/delete/insert while the
  authoritative list stays on screen; saved-not-reloaded; Save not calling
  `live/load`; the confirmed reload calling it with the snapshot's values; the
  failed reload staying visible; the rundown refusal; the lost save race; and the
  live position dropping on an event switch.

Run: `npm test --workspace ems-web` (16 files, 84 tests),
`npm run check-types --workspace ems-web`, `npm test --workspace api` (177 tests) —
all pass. Lint on `src/apps/graphics-controller` went from 54 pre-existing errors to
49; the remainder are untouched files (`rundown-list.tsx`, `use-show-rundown.test.tsx`).

## Handoff

- **`describeDraftSync` is the only place allowed to decide that a draft may carry
  transport state.** Any new Live-tab decoration (badges, counts, "next" markers)
  must be gated on `describesLoaded`, not on `editor.timeline` being non-null — that
  was exactly the old mistake.
- `UseTimelineEditorResult` gained `remoteRevision` and `saveConflict`. Any other
  mock or implementation of that shape needs them; `saveConflict` is cleared by
  `revert()`, by a successful save, and by switching timeline.
- `graphicsApi.live.load` is now called from exactly one place on this page
  (`handleReloadToTransport`) plus the atomic show advance. Reintroducing an implicit
  load anywhere reintroduces the mid-show rewind.
- The reload path cannot serve rundown snapshots at all. If a rundown running order
  ever needs to pick up an edited timeline in place, that is a server-side reload
  command, not a client `live/load` — the schema work was explicitly out of scope
  here.
- `readLoadedRunningOrder` reads `loaded.timelines` for the name and revision; a
  snapshot whose `timelines` array ever stops carrying the playhead's timeline would
  degrade to `null` name/revision and the sync state would read
  `saved-not-reloaded` rather than lying.
- Untouched by design: timeline persistence schemas, rundown ordering, playback
  navigation semantics, and Editor-tab authoring.
