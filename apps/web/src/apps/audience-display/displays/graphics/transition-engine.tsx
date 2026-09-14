import { useEffect, useRef, useState } from 'react';
import type { GraphicSpec, PresentationMode, VizFrame } from '@toa-lib/models';

import { CONTENT_CROSSFADE_MS } from './theme.js';
import { chooseChoreography } from './choreography.js';

/**
 * Choreographs on-air transitions between stats graphics.
 *
 * This is a pure state machine — it owns no rendering. `stats-graphic-display.tsx`
 * consumes `phase` to decide whether the presentation *container* (the
 * drawer/fullscreen/lower-third shell) should be animating in, holding
 * still, or animating out.
 *
 * THE CHOREOGRAPHY RULES:
 *  - Same `mode` on both sides of a change: the container must NOT move or
 *    re-animate. Only the content inside it changes. We never route through
 *    'exiting'/'holding' for this case — `displayedSpec`/`displayedFrame`
 *    swap directly, with a brief 'entering' blip purely so a content-level
 *    crossfade (owned by the consumer) has something to key off of.
 *  - Different `mode`: animate the outgoing container OUT ('exiting'), then
 *    a ~250ms hold with nothing on screen ('holding'), then animate the
 *    incoming container IN ('entering') until it settles ('shown').
 *  - Nothing -> a graphic: 'entering' only (no prior container to exit).
 *  - A graphic -> nothing (clear): 'exiting' only (no incoming container).
 *
 * Timers are the only source of phase advancement, and every timer is
 * tracked so it can be cancled outright the moment a newer change
 * supersedes it — a producer can re-cue mid-transition at any time.
 */

export type GraphicTransitionPhase =
  'idle' | 'entering' | 'shown' | 'exiting' | 'holding';

/** A graphic to start a replay from — see `replayFrom` on `useGraphicTransition`. */
export interface GraphicSnapshot {
  spec: GraphicSpec;
  frame: VizFrame;
}

export interface GraphicTransitionResult {
  phase: GraphicTransitionPhase;
  displayedSpec: GraphicSpec | null;
  displayedFrame: VizFrame | null;
  /**
   * True only while the engine is performing a replay's HARD CUT back to
   * the pre-transition graphic. The consumer must render this commit with
   * every animation duration and delay collapsed to zero — a cut is
   * supposed to be instantaneous, and the shared animation components all
   * animate on mount (`FadeInOut`/`Slide*` start at `localIn: false`), so
   * without that they would fade/slide the "before" state in and the replay
   * would show an entrance that is not the one being previewed.
   */
  cutting: boolean;
}

interface EngineState {
  phase: GraphicTransitionPhase;
  displayedSpec: GraphicSpec | null;
  displayedFrame: VizFrame | null;
  cutting: boolean;
}

const INITIAL_STATE: EngineState = {
  phase: 'idle',
  displayedSpec: null,
  displayedFrame: null,
  cutting: false
};

// Gap between an outgoing container finishing its exit and an incoming
// container starting its entrance, for a different-mode transition. Nothing
// is on screen during this window — see the choreography table above.
const CROSS_MODE_HOLD_MS = 250;

// How long the hard cut of a replay is held before the transition proper
// begins. Must be long enough that the producer actually registers the
// "before" state — a crossfade between two same-mode graphics is
// meaningless if you never saw what it was fading FROM — and long enough
// for React to commit and paint the cut as its own frame.
const REPLAY_CUT_HOLD_MS = 400;

// How long a same-mode content crossfade phase ('entering') is held before
// settling to 'shown'. This never drives the container (which never moves
// for a same-mode change) — it only bounds how long the consumer's
// content-level dissolve (`content-crossfade.tsx`, which owns the actual
// animation) has to key off `phase === 'entering'`, so the two are the same
// shared constant rather than two numbers that have to be kept equal.
const SAME_MODE_CROSSFADE_MS = CONTENT_CROSSFADE_MS;

/**
 * How long the shared animation components (`FadeInOut`/`SlideInLeft`/
 * `SlideInRight`/`SlideInBottom`) take to fully play the enter/exit
 * transition for a given presentation mode, in milliseconds. Mirrors the
 * `duration`/`inDelay` props `stats-graphic-display.tsx` passes to those
 * components:
 *  - fullscreen: `FadeInOut duration={0.5}` (the established full-screen
 *    convention from `display-switcher.tsx`) — symmetric enter/exit.
 *  - drawer-left/right, lower-third: `Slide* duration={1.25} inDelay={0.75}`
 *    (the established lower-third-stream convention, extended to the new
 *    slide directions) — entrance waits out the 0.75s delay before playing
 *    the 1.25s slide (2s total); exit has no delay, so it's just the 1.25s
 *    slide.
 */
function containerTimingMs(mode: PresentationMode): {
  enterMs: number;
  exitMs: number;
} {
  switch (mode) {
    case 'fullscreen':
      return { enterMs: 500, exitMs: 500 };
    case 'drawer-left':
    case 'drawer-right':
    case 'lower-third':
      return { enterMs: 750 + 1250, exitMs: 1250 };
    default:
      return { enterMs: 500, exitMs: 500 };
  }
}

function signatureOf(
  spec: GraphicSpec | null,
  frame: VizFrame | null
): string | null {
  if (!spec) return null;
  // Content, configuration, and provenance all participate. A refresh or
  // correction is allowed to retain both the authored id and asOfUtc; using
  // only those two fields caused the production display to discard a real
  // title/options/data change as a duplicate.
  return JSON.stringify([spec, frame]);
}

function initialEngineState(
  spec: GraphicSpec | null,
  frame: VizFrame | null
): EngineState {
  // A component that mounts while a graphic is already live is a late join,
  // not a new Take. Render the authoritative snapshot settled; a component
  // that was already mounted at idle will still animate a later null->graphic
  // prop change through the effect below.
  return spec && frame
    ? {
        phase: 'shown',
        displayedSpec: spec,
        displayedFrame: frame,
        cutting: false
      }
    : INITIAL_STATE;
}

/**
 * `replayNonce` replays the transition that leads INTO the current graphic -
 * the producer's "Replay in Preview" button. Each increment hard-cuts
 * (instantly, no animation) back to `replayFrom` and then plays the real
 * choreography from it into `spec`.
 *
 * `replayFrom` is the graphic that precedes this one - for a preview screen,
 * whatever is on the program bus right now. Passing it is what makes the
 * replay show the TRUE transition: two same-mode drawers crossfade their
 * contents, a mode change exits and re-enters. Replaying without it (the
 * `null` case, i.e. nothing on air) correctly degrades to a cut-to-black
 * followed by an entrance, which is exactly what airing this graphic onto
 * black would look like.
 *
 * A replay cannot be expressed as a signature change: re-feeding an
 * identical spec through the normal path is a same-mode no-op that only
 * crossfades content. Hence a separate input and a separate branch.
 *
 * Only preview screens ever pass these. They are never wired to the program
 * bus: re-animating something already on air would be a visible glitch to
 * the audience.
 */
export function useGraphicTransition(
  spec: GraphicSpec | null,
  frame: VizFrame | null,
  replayNonce = 0,
  replayFrom: GraphicSnapshot | null = null
): GraphicTransitionResult {
  const [state, setState] = useState<EngineState>(() =>
    initialEngineState(spec, frame)
  );

  // Mirrors `state` synchronously so effect/timer callbacks always read the
  // latest values instead of a stale closure over the last render's state.
  const stateRef = useRef<EngineState>(state);

  // The signature of the last (spec, frame) pair we actually started
  // processing a transition for — guards against re-running the machine
  // when props are referentially new but semantically unchanged (e.g. a
  // parent re-render with an equivalent object).
  const lastSignatureRef = useRef<string | null>(signatureOf(spec, frame));

  // The `replayNonce` the last effect run observed. Seeded with the initial
  // prop so mounting never counts as a replay request.
  const lastReplayNonceRef = useRef(replayNonce);

  // Read through a ref rather than an effect dependency: `replayFrom` is an
  // object the caller rebuilds on most renders, and it is only ever read at
  // the instant a replay starts. As a dependency it would re-run the effect
  // constantly for no benefit.
  const replayFromRef = useRef(replayFrom);
  replayFromRef.current = replayFrom;

  // Bumped every time a NEW transition sequence begins. Every timer
  // callback below closes over the `seq` it was scheduled under and bails
  // if a newer sequence has since started — this is the same
  // generation-counter pattern `displaySeq` uses in
  // `src/api/events/display-event.ts` to let a superseded async handler
  // detect it lost and do nothing.
  const seqRef = useRef(0);

  // Every pending timer from any in-flight sequence, so a superseded
  // sequence's timers can be cancelled outright (not just have their
  // callbacks no-op via `seq`), leaving nothing orphaned.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const scheduleTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const commit = (next: EngineState) => {
    stateRef.current = next;
    setState(next);
  };

  useEffect(() => {
    const incomingSignature = signatureOf(spec, frame);
    const replayRequested = replayNonce !== lastReplayNonceRef.current;
    lastReplayNonceRef.current = replayNonce;

    // Same (spec, frame) we already committed to, and no replay asked for —
    // nothing to do. Prevents redundant re-triggers from referentially-new-
    // but-equal props.
    if (incomingSignature === lastSignatureRef.current && !replayRequested) {
      return;
    }
    lastSignatureRef.current = incomingSignature;

    // Every timer belonging to whatever sequence was previously in flight
    // is now stale — cancel it before starting the new one.
    clearAllTimers();
    const seq = ++seqRef.current;

    // Cleanup runs both on unmount and right before the next time this
    // effect re-runs (i.e. the next real spec/frame change) — either way,
    // every timer this sequence scheduled (including ones nested inside
    // already-fired callbacks, since they all push into the same
    // `timersRef`) is cancelled so nothing is left orphaned.
    const cleanup = () => {
      clearAllTimers();
    };

    const alive = () => seq === seqRef.current;

    /**
     * The full choreography from one graphic to another.
     *
     * `fromSpec`/`fromFrame` are passed in rather than read off
     * `stateRef.current` so a replay can drive this from the graphic it just
     * cut to, instead of from whatever happened to be on screen a moment
     * ago. The normal path simply passes the current display, which is what
     * the old inline version read directly — behaviour there is unchanged.
     */
    const runTransition = (
      fromSpec: GraphicSpec | null,
      fromFrame: VizFrame | null,
      toSpec: GraphicSpec | null,
      toFrame: VizFrame | null
    ) => {
      const fromMode = fromSpec?.mode ?? null;
      const toMode = toSpec?.mode ?? null;
      const choreography = chooseChoreography(fromMode, toMode);

      const enter = () => {
        commit({
          phase: 'entering',
          displayedSpec: toSpec,
          displayedFrame: toFrame,
          cutting: false
        });
        const { enterMs } = containerTimingMs(
          (toMode ?? 'fullscreen') as PresentationMode
        );
        scheduleTimer(() => {
          if (!alive()) return;
          commit({ ...stateRef.current, phase: 'shown' });
        }, enterMs);
      };

      // ---- Nothing -> nothing: no-op (covers initial mount at idle). ----
      if (choreography === 'none') {
        commit(INITIAL_STATE);
        return;
      }

      // ---- A graphic -> nothing (clear): exit only. ----
      if (choreography === 'exit-only') {
        // Keep the OLD spec/frame on screen through the exit so the
        // outgoing container has something to render while it animates
        // away — do NOT clear them yet.
        commit({
          phase: 'exiting',
          displayedSpec: fromSpec,
          displayedFrame: fromFrame,
          cutting: false
        });
        const { exitMs } = containerTimingMs(fromMode as PresentationMode);
        scheduleTimer(() => {
          if (!alive()) return; // superseded — bail.
          commit(INITIAL_STATE);
        }, exitMs);
        return;
      }

      // ---- Nothing -> a graphic: enter only. ----
      if (choreography === 'enter-only') {
        enter();
        return;
      }

      // ---- Same mode: crossfade CONTENT only. The container never receives
      // a phase that would make it move (see `stats-graphic-display.tsx`'s
      // `containerIn` derivation — true for both 'entering' and 'shown'), so
      // it's safe to swap `displayedSpec`/`displayedFrame` immediately. ----
      if (choreography === 'crossfade') {
        commit({
          phase: 'entering',
          displayedSpec: toSpec,
          displayedFrame: toFrame,
          cutting: false
        });
        scheduleTimer(() => {
          if (!alive()) return;
          commit({ ...stateRef.current, phase: 'shown' });
        }, SAME_MODE_CROSSFADE_MS);
        return;
      }

      // ---- Different mode: exit old -> brief hold (nothing on screen) ->
      // enter new. ----
      commit({
        phase: 'exiting',
        displayedSpec: fromSpec,
        displayedFrame: fromFrame,
        cutting: false
      });
      const { exitMs } = containerTimingMs(fromMode as PresentationMode);
      scheduleTimer(() => {
        if (!alive()) return;
        commit({
          phase: 'holding',
          displayedSpec: null,
          displayedFrame: null,
          cutting: false
        });
        scheduleTimer(() => {
          if (!alive()) return;
          enter();
        }, CROSS_MODE_HOLD_MS);
      }, exitMs);
    };

    // ---- Replay: hard cut back to the preceding graphic, then play the
    // real transition into the current one. ----
    // The cut is what makes this show the ACTUAL transition rather than an
    // invented one: `runTransition` then picks the same branch it would when
    // this graphic is really taken to air — a content crossfade between two
    // same-mode drawers, an exit/hold/enter across a mode change, or a plain
    // entrance onto black when nothing is on air.
    if (replayRequested && spec) {
      const from = replayFromRef.current;
      const fromSpec = from?.spec ?? null;
      const fromFrame = from?.frame ?? null;
      commit({
        phase: fromSpec ? 'shown' : 'idle',
        displayedSpec: fromSpec,
        displayedFrame: fromFrame,
        // Collapses every animation to zero for this one commit, so the
        // "before" state appears instantly instead of animating itself in.
        cutting: true
      });
      scheduleTimer(() => {
        if (!alive()) return;
        runTransition(fromSpec, fromFrame, spec, frame);
      }, REPLAY_CUT_HOLD_MS);
      return cleanup;
    }

    runTransition(
      stateRef.current.displayedSpec,
      stateRef.current.displayedFrame,
      spec,
      frame
    );
    return cleanup;
  }, [spec, frame, replayNonce]);

  return state;
}

export default useGraphicTransition;
