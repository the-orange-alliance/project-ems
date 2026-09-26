import { useEffect, useState } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import {
  commit,
  createTransitionCommit,
  deriveVisual,
  initialMachineState,
  type GraphicSnapshot,
  type TransitionAuthority,
  type VisualState
} from './transition-machine.js';

// Public production exports are also the test entry point.
export * from './transition-machine.js';
export type GraphicTransitionPhase = VisualState['phase'];
export interface GraphicTransitionResult extends VisualState {
  displayedSpec: GraphicSpec | null;
  displayedFrame: VizFrame | null;
  sampledAtMs: number;
}

/** React only supplies a clock, submits inputs, and schedules the machine's next deadline. */
export function useGraphicTransition(
  spec: GraphicSpec | null,
  frame: VizFrame | null,
  replayNonce = 0,
  replayFrom: GraphicSnapshot | null = null,
  authority?: TransitionAuthority,
  preview = false
): GraphicTransitionResult {
  const input = createTransitionCommit(
    spec,
    frame,
    authority,
    preview,
    replayNonce,
    replayFrom
  );
  const nowMs = Date.now();
  const [machine, setMachine] = useState(() =>
    commit(initialMachineState, input, nowMs)
  );
  const [, wake] = useState(0);
  // React restarts this component before committing a changed input. The pure
  // machine deduplicates StrictMode renders; no refs are mutated during render.
  const accepted = commit(machine, input, nowMs);
  if (accepted !== machine) setMachine(accepted);
  const visual = deriveVisual(accepted.schedule, nowMs);
  const deadline = visual.nextWakeAtMs;
  useEffect(() => {
    if (deadline === null) return;
    let alive = true;
    const timer = setTimeout(
      () => {
        if (alive) wake((value) => value + 1);
      },
      Math.max(0, deadline - Date.now())
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [accepted, deadline]);
  const current = visual.layers.at(-1);
  return {
    ...visual,
    displayedSpec: current?.spec ?? null,
    displayedFrame: current?.frame ?? null,
    sampledAtMs: nowMs
  };
}
export default useGraphicTransition;
