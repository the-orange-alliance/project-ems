/** Plain-script regression checks for the same pure machine exported by production. Run npm run selftest:transitions --workspace ems-web. */

import assert from 'node:assert/strict';
import type { GraphicSpec, PresentationMode, VizFrame } from '@toa-lib/models';
import {
  activeCommitAt,
  commit,
  CROSS_MODE_GAP_MS,
  DEFAULT_CROSSFADE_MS,
  deriveVisual,
  initialMachineState,
  resolveTiming,
  withReducedMotion,
  type MachineState,
  type NonEmptyCommit,
  type TransitionCommit
} from './transition-machine.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function spec(
  id: string,
  mode: PresentationMode,
  overrides: Partial<GraphicSpec> = {}
): GraphicSpec {
  return {
    id,
    title: `Title ${id}`,
    stat: 'some.stat',
    selectors: {},
    filters: {},
    params: {},
    kind: 'stat-tile',
    mode,
    options: {},
    ...overrides
  } as GraphicSpec;
}

function frame(asOfUtc: string): VizFrame {
  return {
    kind: 'stat-tile',
    title: 'Title',
    asOfUtc,
    quality: 'complete',
    warnings: [],
    series: []
  };
}

function commitOf(
  revision: number,
  s: GraphicSpec | null,
  f: VizFrame | null,
  extra: {
    effectiveAtMs?: number;
    timingOverride?: Partial<
      import('./transition-machine.js').TransitionTiming
    >;
  } = {}
): TransitionCommit {
  if (s === null || f === null) {
    return { revision, spec: null, frame: null, ...extra };
  }
  return { revision, spec: s, frame: f, ...extra };
}

/* ------------------------------------------------------------------ */
/* 1. Same-mode replacement -> true two-layer crossfade                */
/* ------------------------------------------------------------------ */

check(
  'same-mode replacement crossfades both layers, container never moves',
  () => {
    let m = initialMachineState;
    m = commit(m, commitOf(1, spec('a', 'fullscreen'), frame('t1')), 0);
    // First commit ever -> settles instantly (late-mount rule), not a crossfade.
    let v = deriveVisual(m.schedule, 0);
    assert.equal(v.phase, 'shown');
    assert.equal(v.containerIn, true);

    m = commit(m, commitOf(2, spec('b', 'fullscreen'), frame('t2')), 1000);
    assert.equal(m.schedule.kind, 'crossfade');

    // Mid-crossfade: BOTH layers mounted simultaneously.
    v = deriveVisual(m.schedule, 1100);
    assert.equal(v.phase, 'entering');
    assert.equal(v.layers.length, 2);
    assert.ok(v.layers.some((l) => l.role === 'exit' && l.revision === 1));
    assert.ok(v.layers.some((l) => l.role === 'enter' && l.revision === 2));
    // The container itself must not move for a same-mode change.
    assert.equal(v.containerIn, true);
    assert.equal(v.containerMode, 'fullscreen');

    // After the crossfade window: only the new content remains.
    v = deriveVisual(m.schedule, 1000 + DEFAULT_CROSSFADE_MS + 1);
    assert.equal(v.phase, 'shown');
    assert.equal(v.layers.length, 1);
    assert.equal(v.layers[0].revision, 2);
  }
);

/* ------------------------------------------------------------------ */
/* 2. Different-mode ordering: exit -> 250ms empty gap -> enter         */
/* ------------------------------------------------------------------ */

check('different-mode change orders exit -> 250ms empty gap -> enter', () => {
  let m = initialMachineState;
  m = commit(m, commitOf(1, spec('a', 'fullscreen'), frame('t1')), 0);
  deriveVisual(m.schedule, 0); // settle

  m = commit(m, commitOf(2, spec('b', 'drawer-left'), frame('t2')), 1000);
  assert.equal(m.schedule.kind, 'cross-mode');
  if (m.schedule.kind !== 'cross-mode') throw new Error('unreachable');
  assert.equal(m.schedule.gapMs, CROSS_MODE_GAP_MS);

  const { exitMs } = m.schedule; // fullscreen default exit
  const { gapMs } = m.schedule;
  const { enterMs } = m.schedule; // drawer-left default enter

  // During the exit: old content only, container animating out.
  let v = deriveVisual(m.schedule, 1000 + exitMs / 2);
  assert.equal(v.phase, 'exiting');
  assert.equal(v.layers.length, 1);
  assert.equal(v.layers[0].role, 'exit');
  assert.equal(v.layers[0].revision, 1);
  assert.equal(v.containerMode, 'fullscreen');
  assert.equal(v.containerIn, false);

  // During the gap: NOTHING mounted at all.
  v = deriveVisual(m.schedule, 1000 + exitMs + gapMs / 2);
  assert.equal(v.phase, 'holding');
  assert.equal(v.layers.length, 0);
  assert.equal(v.containerMode, null);

  // After the gap: new content entering in its own (different) mode.
  v = deriveVisual(m.schedule, 1000 + exitMs + gapMs + 1);
  assert.equal(v.phase, 'entering');
  assert.equal(v.layers.length, 1);
  assert.equal(v.layers[0].role, 'enter');
  assert.equal(v.layers[0].revision, 2);
  assert.equal(v.containerMode, 'drawer-left');
  assert.equal(v.containerIn, true);

  // Settled after enterMs.
  v = deriveVisual(m.schedule, 1000 + exitMs + gapMs + enterMs + 1);
  assert.equal(v.phase, 'shown');
});

/* ------------------------------------------------------------------ */
/* 3. Clear: content stays mounted for the FULL exit                   */
/* ------------------------------------------------------------------ */

check(
  'Clear keeps outgoing content mounted for the whole exit, then idles',
  () => {
    let m = initialMachineState;
    m = commit(m, commitOf(1, spec('a', 'fullscreen'), frame('t1')), 0);
    deriveVisual(m.schedule, 0);

    m = commit(m, commitOf(2, null, null), 500);
    assert.equal(m.schedule.kind, 'exit-only');
    if (m.schedule.kind !== 'exit-only') throw new Error('unreachable');
    const { exitMs } = m.schedule;

    let v = deriveVisual(m.schedule, 500); // the instant Clear starts
    assert.equal(v.phase, 'exiting');
    assert.equal(v.layers.length, 1, 'outgoing content must still be mounted');
    assert.equal(v.layers[0].role, 'exit');

    v = deriveVisual(m.schedule, 500 + exitMs - 1); // just before done
    assert.equal(
      v.layers.length,
      1,
      'content must stay mounted until exitMs elapses'
    );

    v = deriveVisual(m.schedule, 500 + exitMs + 1); // after done
    assert.equal(v.phase, 'idle');
    assert.equal(v.layers.length, 0);
  }
);

/* ------------------------------------------------------------------ */
/* 4. Identical cached data, changed layout -> still a mode transition */
/* ------------------------------------------------------------------ */

check(
  'same frame data but a changed mode still runs the cross-mode path',
  () => {
    const sharedFrame = frame('same-timestamp'); // literally the same object
    let m = initialMachineState;
    m = commit(m, commitOf(1, spec('a', 'fullscreen'), sharedFrame), 0);
    deriveVisual(m.schedule, 0);

    // Same underlying frame object/content, but the producer re-laid the
    // graphic out in a different presentation mode -> a genuinely new
    // revision, and mode differs, so this must NOT be treated as a same-mode
    // crossfade.
    m = commit(m, commitOf(2, spec('a', 'drawer-right'), sharedFrame), 10);
    assert.equal(m.schedule.kind, 'cross-mode');
  }
);

/* ------------------------------------------------------------------ */
/* 5. Rapid replacement mid-transition supersedes cleanly               */
/* ------------------------------------------------------------------ */

check(
  'a rapid replacement mid-exit supersedes without resurrecting stale content',
  () => {
    let m = initialMachineState;
    m = commit(m, commitOf(1, spec('a', 'fullscreen'), frame('t1')), 0);
    deriveVisual(m.schedule, 0);

    m = commit(m, commitOf(2, spec('b', 'drawer-left'), frame('t2')), 1000);
    if (m.schedule.kind !== 'cross-mode') throw new Error('unreachable');
    const midExit = 1000 + m.schedule.exitMs / 2;

    // Revision 2 is superseded by revision 3 WHILE revision 1 is still
    // visually exiting (before the gap even starts).
    const supersededFrom = activeCommitAt(m.schedule, midExit);
    assert.equal(
      supersededFrom?.revision,
      1,
      'the viewer was still looking at revision 1'
    );

    m = commit(m, commitOf(3, spec('c', 'lower-third'), frame('t3')), midExit);
    assert.equal(m.activeRevision, 3);
    if (m.schedule.kind !== 'cross-mode') throw new Error('unreachable');
    assert.equal(
      m.schedule.from.revision,
      1,
      'the new transition exits FROM what was actually on screen'
    );
    assert.equal(m.schedule.to.revision, 3);

    const v = deriveVisual(m.schedule, midExit);
    assert.equal(
      v.layers.every((l) => l.revision !== 2),
      true,
      'revision 2 never rendered at all'
    );
  }
);

/* ------------------------------------------------------------------ */
/* 6. REVISION KEYING: a referentially-new-but-equivalent object no-ops */
/* ------------------------------------------------------------------ */

check(
  'a referentially-new-but-equal (spec, frame) at the same revision is a no-op',
  () => {
    const s1 = spec('a', 'fullscreen');
    const f1 = frame('t1');
    let m = initialMachineState;
    m = commit(m, commitOf(1, s1, f1), 0);
    const afterFirst: MachineState = m;

    // A brand new object graph, structurally equal, SAME revision — e.g. a
    // parent re-render recomputing an equivalent spec/frame pair.
    const s1Equivalent = spec('a', 'fullscreen');
    const f1Equivalent = frame('t1');
    assert.notEqual(
      s1Equivalent,
      s1,
      'must be a different reference to prove this'
    );
    assert.notEqual(
      f1Equivalent,
      f1,
      'must be a different reference to prove this'
    );

    m = commit(m, commitOf(1, s1Equivalent, f1Equivalent), 5000);
    assert.equal(
      m,
      afterFirst,
      'commit() must return the exact same state object — a true no-op'
    );
  }
);

/* ------------------------------------------------------------------ */
/* 7. Late replay: a fresh mount settles onto the current program       */
/* ------------------------------------------------------------------ */

check(
  'a late/reconnecting mount settles instantly, never replaying a 2-minute-old entrance',
  () => {
    const twoMinutesAgo = -120_000; // effectiveAtMs relative to nowMs=0
    const m = commit(
      initialMachineState,
      commitOf(1, spec('a', 'lower-third'), frame('t1'), {
        effectiveAtMs: twoMinutesAgo
      }),
      0
    );
    assert.equal(m.schedule.kind, 'settled');
    const v = deriveVisual(m.schedule, 0);
    assert.equal(v.phase, 'shown');
    assert.equal(v.containerIn, true);
    assert.equal(v.nextWakeAtMs, null, 'nothing left to animate');
  }
);

check(
  'a mount with no effectiveAtMs at all also settles instantly rather than guessing',
  () => {
    const m = commit(
      initialMachineState,
      commitOf(1, spec('a', 'fullscreen'), frame('t1')),
      0
    );
    assert.equal(m.schedule.kind, 'settled');
  }
);

check(
  'a mount that lands genuinely mid-entrance still does not replay an exit it never saw',
  () => {
    // Connects 100ms after a transition that started at t=0 with a 500ms
    // fullscreen entrance — still "fresh" enough that entrance replay is
    // reasonable, but there is still no attempt to fabricate an 'exiting'
    // phase for content this client never had.
    const m = commit(
      initialMachineState,
      commitOf(1, spec('a', 'fullscreen'), frame('t1'), { effectiveAtMs: 0 }),
      100
    );
    assert.equal(m.schedule.kind, 'enter-only');
    const v = deriveVisual(m.schedule, 100);
    assert.equal(
      v.nextWakeAtMs,
      500,
      'late entrance retains its effective-time deadline'
    );
    assert.equal(v.phase, 'entering');
    assert.equal(
      v.layers.every((l) => l.role !== 'exit'),
      true
    );
  }
);

/* ------------------------------------------------------------------ */
/* 8. Reduced motion                                                    */
/* ------------------------------------------------------------------ */

check(
  'reduced motion collapses animated durations to 0 but preserves the 250ms gap',
  () => {
    const base = resolveTiming('fullscreen', 'drawer-left');
    const reduced = withReducedMotion(base);
    assert.equal(reduced.crossfadeMs, 0);
    assert.equal(reduced.exitMs, 0);
    assert.equal(reduced.enterMs, 0);
    assert.equal(
      reduced.gapMs,
      CROSS_MODE_GAP_MS,
      'the gap is a content pause, not motion'
    );

    let m = initialMachineState;
    m = commit(
      m,
      commitOf(1, spec('a', 'fullscreen'), frame('t1'), {
        timingOverride: reduced
      }),
      0
    );
    deriveVisual(m.schedule, 0);
    m = commit(
      m,
      commitOf(2, spec('b', 'drawer-left'), frame('t2'), {
        timingOverride: reduced
      }),
      1000
    );
    if (m.schedule.kind !== 'cross-mode') throw new Error('unreachable');
    assert.equal(m.schedule.exitMs, 0);
    assert.equal(m.schedule.enterMs, 0);
    assert.equal(m.schedule.gapMs, CROSS_MODE_GAP_MS);

    // Exit is instantaneous -> immediately in the gap.
    let v = deriveVisual(m.schedule, 1000);
    assert.equal(v.phase, 'holding');
    // Gap still elapses for real.
    v = deriveVisual(m.schedule, 1000 + CROSS_MODE_GAP_MS + 1);
    assert.equal(v.phase, 'shown');
  }
);

/* ------------------------------------------------------------------ */
/* 9. Recovery after a renderer failure: distinct revisions => distinct */
/*    React keys, so an error boundary keyed on `layer.revision` always */
/*    remounts fresh for the next cue (see transition-engine.tsx).      */
/* ------------------------------------------------------------------ */

check(
  'every distinct revision produces a distinct layer identity to key a remount on',
  () => {
    let m = initialMachineState;
    m = commit(m, commitOf(1, spec('a', 'fullscreen'), frame('t1')), 0);
    const v1 = deriveVisual(m.schedule, 0);

    m = commit(m, commitOf(2, spec('a', 'fullscreen'), frame('t2')), 1000);
    const v2 = deriveVisual(m.schedule, 1000 + DEFAULT_CROSSFADE_MS + 1);

    assert.equal(v1.layers[0].revision, 1);
    assert.equal(v2.layers[0].revision, 2);
    assert.notEqual(
      v1.layers[0].revision,
      v2.layers[0].revision,
      'a crashed revision-1 error boundary keyed on revision must not be reused for revision 2'
    );
  }
);

console.log(`\n${passed} check(s) passed.`);
