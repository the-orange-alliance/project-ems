import type { GraphicSpec, PresentationMode, VizFrame } from '@toa-lib/models';

/**
 * Pure, framework-free graphics transition state machine.
 *
 * This module owns ZERO timers, ZERO React, and ZERO wall-clock reads of its
 * own (`Date.now()` never appears below) — every function here takes `nowMs`
 * as an explicit argument. That is the "injectable clock": a caller (a React
 * adapter in production, a plain script in a test) supplies `nowMs` and gets
 * back a deterministic answer. This is what makes the choreography testable
 * by ANY runner (or no runner at all — see `transition-machine.selftest.ts`)
 * without mocking `setTimeout`/`Date.now` or rendering a component.
 *
 * THE CORE IDEA — a schedule sampled by time, not a timer chain:
 * `commit()` looks at a durable REVISION change and decides a `Schedule` —
 * a small plan (which commit(s) are involved, when it started, how long
 * each leg takes). `deriveVisual()` then purely SAMPLES that plan at any
 * `nowMs` to produce what should currently be on screen. Nothing here
 * mutates over time by itself; calling `deriveVisual` twice with the same
 * `(schedule, nowMs)` always returns the same answer. This is also what
 * solves the "late client" problem for free: a client that mounts two
 * minutes into a graphic's run just calls `commit()` for the first time with
 * `nowMs` far past the transition's `effectiveAtMs`, and the resulting
 * schedule is `'settled'` — no different, mechanically, from sampling any
 * other schedule far past its own completion.
 *
 * THE CHOREOGRAPHY RULES (unchanged in spirit from the previous, timer-based
 * engine):
 *  - Same `mode` on both sides of a change: the container must NOT move or
 *    re-animate — content crossfades in place (`'crossfade'`, both layers
 *    mounted at once).
 *  - Different `mode`: animate the outgoing container OUT (`'exiting'`),
 *    then an empty `gapMs` hold with nothing on screen (`'holding'`), then
 *    animate the incoming container IN (`'entering'`) until it settles
 *    (`'shown'`).
 *  - Nothing -> a graphic: `'entering'` only (no prior container to exit).
 *  - A graphic -> nothing (Clear): `'exiting'` only (no incoming container) —
 *    the outgoing content stays part of the schedule (and so stays mounted,
 *    per the adapter) for the FULL exit, never disappearing early.
 *  - A fresh `commit()` (nothing committed yet this machine's lifetime)
 *    never replays a transition into the current program — see `'settled'`
 *    below.
 */

/* ------------------------------------------------------------------ */
/* Identity: durable revision, never object identity or asOfUtc        */
/* ------------------------------------------------------------------ */

/**
 * One commit the machine can be told about: a durable `revision` (the ONLY
 * field ever compared for identity — see `commit()`), plus the payload that
 * revision carries. `spec`/`frame` are null together, meaning "nothing
 * should be on air" (a Clear), or both present together (a real graphic).
 *
 * `effectiveAtMs` and `timingOverride` describe the AUTHORITATIVE contract
 * for how this revision came to be current (mirrors the v2
 * `GraphicsTransition` — `effectiveAtUtc` and its duration fields). Both are
 * optional: a caller that doesn't yet carry that contract (see
 * `transition-engine.tsx`'s fallback) can omit them and get sane built-in
 * defaults, at the cost of losing precise late-join replay avoidance for the
 * rare "connected mid-entrance" edge case (a fresh mount still never REPLAYS
 * a stale transition either way — see `'settled'`).
 */
export type TransitionCommit =
  | {
      revision: number;
      spec: null;
      frame: null;
      effectiveAtMs?: number;
      timingOverride?: Partial<TransitionTiming>;
    }
  | {
      revision: number;
      spec: GraphicSpec;
      frame: VizFrame;
      effectiveAtMs?: number;
      timingOverride?: Partial<TransitionTiming>;
    };

/** The `spec`/`frame`-present variant of `TransitionCommit`. */
export type NonEmptyCommit = Extract<TransitionCommit, { spec: GraphicSpec }>;

export interface TransitionTiming {
  /** Content-level crossfade duration for a same-mode replacement, ms. */
  crossfadeMs: number;
  /** How long the outgoing container's exit animation takes, ms. */
  exitMs: number;
  /** Fixed empty-screen gap between a different-mode exit and its entrance,
   * ms. Authoritatively 250 per the v2 contract
   * (`graphicsTransitionZod.gapMs`, a `z.literal(250)`) — see
   * `CROSS_MODE_GAP_MS`. */
  gapMs: number;
  /** How long the incoming container's entrance animation takes, ms. */
  enterMs: number;
}

/* ------------------------------------------------------------------ */
/* Default timing (used only when a commit doesn't carry an override)  */
/* ------------------------------------------------------------------ */

// Matches `echartsTheme.animationDurationUpdate` in theme.ts, so a chart's
// own internal update animation and the content crossfade land together.
export const DEFAULT_CROSSFADE_MS = 300;

// The empty-screen pause between an outgoing container finishing its exit
// and an incoming container starting its entrance, for a different-mode
// transition. Authoritative per the v2 contract
// (`graphicsTransitionZod.gapMs`) — not a knob, a fixed 250ms.
export const CROSS_MODE_GAP_MS = 250;

/**
 * Built-in enter/exit durations for a mode, used only as a fallback when a
 * commit carries no server-authoritative `timingOverride`. Mirrors the
 * `duration` props `transition-engine.tsx`'s React adapter passes to the
 * shared animation components for that mode:
 *  - fullscreen: `FadeInOut duration={0.5}` — symmetric enter/exit.
 *  - drawer-left/right, lower-third: `Slide* duration={1.25}` — symmetric
 *    enter/exit. Deliberately does NOT bake in the components' `inDelay`
 *    convention (`inDelay={0.75}` elsewhere in the app) — an entry delay
 *    must never silently extend `CROSS_MODE_GAP_MS`; see
 *    `transition-engine.tsx`'s module doc.
 */
export function defaultTimingForMode(mode: PresentationMode): TransitionTiming {
  switch (mode) {
    case 'fullscreen':
      return {
        crossfadeMs: DEFAULT_CROSSFADE_MS,
        exitMs: 500,
        gapMs: CROSS_MODE_GAP_MS,
        enterMs: 500
      };
    case 'drawer-left':
    case 'drawer-right':
    case 'lower-third':
      return {
        crossfadeMs: DEFAULT_CROSSFADE_MS,
        exitMs: 1250,
        gapMs: CROSS_MODE_GAP_MS,
        enterMs: 1250
      };
    default:
      return {
        crossfadeMs: DEFAULT_CROSSFADE_MS,
        exitMs: 500,
        gapMs: CROSS_MODE_GAP_MS,
        enterMs: 500
      };
  }
}

/**
 * Resolves one fully-populated `TransitionTiming` for a transition FROM
 * `fromMode` TO `toMode` (either may be null — nothing on either side).
 * `exitMs` is drawn from the OUTGOING side's defaults, `crossfadeMs`/
 * `enterMs` from the INCOMING side's — a fullscreen -> drawer-left change
 * exits at fullscreen's pace and enters at drawer-left's, not the same
 * mode's pace on both ends. `gapMs` is always the fixed constant unless
 * explicitly overridden. Any field present in `override` wins outright.
 */
export function resolveTiming(
  fromMode: PresentationMode | null,
  toMode: PresentationMode | null,
  override?: Partial<TransitionTiming>
): TransitionTiming {
  const toDefaults = defaultTimingForMode(toMode ?? fromMode ?? 'fullscreen');
  const fromDefaults = defaultTimingForMode(fromMode ?? toMode ?? 'fullscreen');
  return {
    crossfadeMs: override?.crossfadeMs ?? toDefaults.crossfadeMs,
    exitMs: override?.exitMs ?? fromDefaults.exitMs,
    gapMs: override?.gapMs ?? CROSS_MODE_GAP_MS,
    enterMs: override?.enterMs ?? toDefaults.enterMs
  };
}

/**
 * Reduced-motion behavior, defined explicitly: every MOTION duration
 * (crossfade/exit/enter) collapses to 0 — content and containers cut
 * instantly instead of animating. `gapMs` is deliberately left untouched:
 * it isn't motion, it's a fixed on-air content gap (a beat of nothing
 * between two different-mode graphics) with its own accessibility value
 * independent of animated motion, and it's a contract constant
 * (`CROSS_MODE_GAP_MS`) rather than a stylistic duration.
 */
export function withReducedMotion(timing: TransitionTiming): TransitionTiming {
  return { ...timing, crossfadeMs: 0, exitMs: 0, enterMs: 0 };
}

/* ------------------------------------------------------------------ */
/* Schedule: the plan decided once at commit time                      */
/* ------------------------------------------------------------------ */

export type TransitionPhase =
  'idle' | 'entering' | 'shown' | 'exiting' | 'holding';

export type Schedule =
  | { kind: 'idle' }
  /** A fresh mount settling directly onto an already-current program — no
   * transition is played. See `commit()`'s first-commit branch. */
  | { kind: 'settled'; commit: NonEmptyCommit }
  | {
      kind: 'enter-only';
      commit: NonEmptyCommit;
      startMs: number;
      enterMs: number;
    }
  | {
      kind: 'exit-only';
      commit: NonEmptyCommit;
      startMs: number;
      exitMs: number;
    }
  | {
      kind: 'crossfade';
      from: NonEmptyCommit;
      to: NonEmptyCommit;
      startMs: number;
      crossfadeMs: number;
    }
  | {
      kind: 'cross-mode';
      from: NonEmptyCommit;
      to: NonEmptyCommit;
      startMs: number;
      exitMs: number;
      gapMs: number;
      enterMs: number;
    };

export interface MachineState {
  /** The revision of the most recent commit this machine actually accepted
   * (i.e. did not short-circuit as a no-op) — `null` before the first
   * commit. The ONLY value `commit()` compares for identity. */
  activeRevision: number | null;
  schedule: Schedule;
}

export const initialMachineState: MachineState = {
  activeRevision: null,
  schedule: { kind: 'idle' }
};

/**
 * What a viewer is CURRENTLY seeing as the primary (topmost) commit, given a
 * schedule sampled at `nowMs` — `null` while nothing is on screen (idle, or
 * mid-`gapMs` hold of a cross-mode transition). Used both by `deriveVisual`
 * (to build layers/chrome) and by `commit()` (to seed the `from` side of the
 * NEXT transition when one supersedes this one mid-flight — exactly mirrors
 * what a viewer's eye is on at the instant of supersession, matching the
 * previous timer-based engine's supersede behavior).
 */
export function activeCommitAt(
  schedule: Schedule,
  nowMs: number
): NonEmptyCommit | null {
  switch (schedule.kind) {
    case 'idle':
      return null;
    case 'settled':
    case 'enter-only':
    case 'exit-only':
      return schedule.commit;
    case 'crossfade':
      return schedule.to;
    case 'cross-mode': {
      const elapsed = nowMs - schedule.startMs;
      if (elapsed < schedule.exitMs) return schedule.from;
      if (elapsed < schedule.exitMs + schedule.gapMs) return null;
      return schedule.to;
    }
  }
}

/**
 * Advances the machine to a new durable revision, or no-ops.
 *
 * REVISION KEYING: the very first thing this does is compare
 * `next.revision` to `state.activeRevision`. Two referentially-different
 * `TransitionCommit`s that happen to carry the SAME revision (e.g. a parent
 * re-render constructing an equivalent-but-new `spec`/`frame` object pair
 * for a program that hasn't actually changed) hit this guard and change
 * NOTHING — no new schedule, no re-triggered animation. `spec.id` and
 * `frame.asOfUtc` — both of which can legitimately repeat, or change on a
 * mere recompute that carries no real content change — are never consulted.
 */
export function commit(
  state: MachineState,
  next: TransitionCommit,
  nowMs: number
): MachineState {
  if (state.activeRevision === next.revision) return state;

  const from = activeCommitAt(state.schedule, nowMs);
  const isFirstCommit = state.activeRevision === null;

  let schedule: Schedule;

  if (isFirstCommit) {
    // ---- Late/reconnecting mount: settle onto whatever the CURRENT
    // program already is, never replay the transition that put it there. ----
    if (next.spec === null) {
      schedule = { kind: 'idle' };
    } else {
      const timing = resolveTiming(null, next.spec.mode, next.timingOverride);
      const elapsed =
        typeof next.effectiveAtMs === 'number' &&
        Number.isFinite(next.effectiveAtMs)
          ? Math.max(0, nowMs - next.effectiveAtMs)
          : Number.POSITIVE_INFINITY;
      if (elapsed >= timing.enterMs) {
        schedule = { kind: 'settled', commit: next };
      } else {
        schedule = {
          kind: 'enter-only',
          commit: next,
          startMs: nowMs,
          enterMs: timing.enterMs
        };
      }
    }
  } else if (next.spec === null) {
    // ---- A graphic -> nothing (Clear): exit only. The outgoing commit is
    // carried forward in the schedule (not discarded), so the adapter keeps
    // rendering its content mounted for the whole exit. ----
    if (from === null) {
      schedule = { kind: 'idle' };
    } else {
      const timing = resolveTiming(from.spec.mode, null, next.timingOverride);
      schedule = {
        kind: 'exit-only',
        commit: from,
        startMs: nowMs,
        exitMs: timing.exitMs
      };
    }
  } else if (from === null) {
    // ---- Nothing -> a graphic: enter only. ----
    const timing = resolveTiming(null, next.spec.mode, next.timingOverride);
    schedule = {
      kind: 'enter-only',
      commit: next,
      startMs: nowMs,
      enterMs: timing.enterMs
    };
  } else if (from.spec.mode === next.spec.mode) {
    // ---- Same mode: true two-layer content crossfade. The container never
    // receives a phase that would make it move. ----
    const timing = resolveTiming(
      from.spec.mode,
      next.spec.mode,
      next.timingOverride
    );
    schedule = {
      kind: 'crossfade',
      from,
      to: next,
      startMs: nowMs,
      crossfadeMs: timing.crossfadeMs
    };
  } else {
    // ---- Different mode: exit old -> empty gap -> enter new. ----
    const timing = resolveTiming(
      from.spec.mode,
      next.spec.mode,
      next.timingOverride
    );
    schedule = {
      kind: 'cross-mode',
      from,
      to: next,
      startMs: nowMs,
      exitMs: timing.exitMs,
      gapMs: timing.gapMs,
      enterMs: timing.enterMs
    };
  }

  return { activeRevision: next.revision, schedule };
}

/* ------------------------------------------------------------------ */
/* Visual derivation: pure sampling of a schedule at a point in time   */
/* ------------------------------------------------------------------ */

export interface ContentLayer {
  role: 'enter' | 'exit';
  revision: number;
  spec: GraphicSpec;
  frame: VizFrame;
}

export interface VisualState {
  phase: TransitionPhase;
  /** Content layers to mount simultaneously, back-to-front. At most one
   * `'exit'` + one `'enter'` (during a same-mode crossfade); otherwise at
   * most a single layer. */
  layers: ContentLayer[];
  /** Which container (fullscreen/drawer/lower-third) should be mounted, or
   * `null` when nothing should render at all. */
  containerMode: PresentationMode | null;
  /** Whether the mounted container should be in its settled/entered visual
   * position (`true`) or animating/settled to its exited position
   * (`false`). Same-mode changes always keep this `true` — that's the
   * "container never re-animates" rule. */
  containerIn: boolean;
  chrome: { title?: string; subtitle?: string } | null;
  /** Absolute `nowMs`-scale time this visual state will next change on its
   * own (a phase boundary), or `null` if nothing further will happen
   * without a new `commit()`. The ONLY thing an adapter needs to schedule a
   * timer for. */
  nextWakeAtMs: number | null;
}

const chromeOf = (c: NonEmptyCommit) => ({
  title: c.spec.title,
  subtitle: c.spec.subtitle
});

export function deriveVisual(schedule: Schedule, nowMs: number): VisualState {
  switch (schedule.kind) {
    case 'idle':
      return {
        phase: 'idle',
        layers: [],
        containerMode: null,
        containerIn: false,
        chrome: null,
        nextWakeAtMs: null
      };

    case 'settled': {
      const c = schedule.commit;
      return {
        phase: 'shown',
        layers: [
          { role: 'enter', revision: c.revision, spec: c.spec, frame: c.frame }
        ],
        containerMode: c.spec.mode,
        containerIn: true,
        chrome: chromeOf(c),
        nextWakeAtMs: null
      };
    }

    case 'enter-only': {
      const c = schedule.commit;
      const elapsed = nowMs - schedule.startMs;
      const done = elapsed >= schedule.enterMs;
      return {
        phase: done ? 'shown' : 'entering',
        layers: [
          { role: 'enter', revision: c.revision, spec: c.spec, frame: c.frame }
        ],
        containerMode: c.spec.mode,
        containerIn: true,
        chrome: chromeOf(c),
        nextWakeAtMs: done ? null : schedule.startMs + schedule.enterMs
      };
    }

    case 'exit-only': {
      const c = schedule.commit;
      const elapsed = nowMs - schedule.startMs;
      const done = elapsed >= schedule.exitMs;
      if (done) {
        return {
          phase: 'idle',
          layers: [],
          containerMode: null,
          containerIn: false,
          chrome: null,
          nextWakeAtMs: null
        };
      }
      return {
        phase: 'exiting',
        // Outgoing content stays mounted (role 'exit') for the FULL exit —
        // never unmounted early.
        layers: [
          { role: 'exit', revision: c.revision, spec: c.spec, frame: c.frame }
        ],
        containerMode: c.spec.mode,
        containerIn: false,
        chrome: chromeOf(c),
        nextWakeAtMs: schedule.startMs + schedule.exitMs
      };
    }

    case 'crossfade': {
      const elapsed = nowMs - schedule.startMs;
      const done = elapsed >= schedule.crossfadeMs;
      const enterLayer: ContentLayer = {
        role: 'enter',
        revision: schedule.to.revision,
        spec: schedule.to.spec,
        frame: schedule.to.frame
      };
      const layers: ContentLayer[] = done
        ? [enterLayer]
        : [
            {
              role: 'exit',
              revision: schedule.from.revision,
              spec: schedule.from.spec,
              frame: schedule.from.frame
            },
            enterLayer
          ];
      return {
        phase: done ? 'shown' : 'entering',
        layers,
        containerMode: schedule.to.spec.mode,
        // Same mode -> the container is already in place and never
        // re-animates for this transition.
        containerIn: true,
        chrome: chromeOf(schedule.to),
        nextWakeAtMs: done ? null : schedule.startMs + schedule.crossfadeMs
      };
    }

    case 'cross-mode': {
      const elapsed = nowMs - schedule.startMs;

      if (elapsed < schedule.exitMs) {
        const c = schedule.from;
        return {
          phase: 'exiting',
          layers: [
            { role: 'exit', revision: c.revision, spec: c.spec, frame: c.frame }
          ],
          containerMode: c.spec.mode,
          containerIn: false,
          chrome: chromeOf(c),
          nextWakeAtMs: schedule.startMs + schedule.exitMs
        };
      }

      if (elapsed < schedule.exitMs + schedule.gapMs) {
        return {
          phase: 'holding',
          layers: [],
          containerMode: null,
          containerIn: false,
          chrome: null,
          nextWakeAtMs: schedule.startMs + schedule.exitMs + schedule.gapMs
        };
      }

      const enterElapsed = elapsed - schedule.exitMs - schedule.gapMs;
      const done = enterElapsed >= schedule.enterMs;
      const c = schedule.to;
      return {
        phase: done ? 'shown' : 'entering',
        layers: [
          { role: 'enter', revision: c.revision, spec: c.spec, frame: c.frame }
        ],
        containerMode: c.spec.mode,
        containerIn: true,
        chrome: chromeOf(c),
        nextWakeAtMs: done
          ? null
          : schedule.startMs +
            schedule.exitMs +
            schedule.gapMs +
            schedule.enterMs
      };
    }
  }
}
