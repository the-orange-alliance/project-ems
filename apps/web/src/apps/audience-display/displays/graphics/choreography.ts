import type { PresentationMode } from '@toa-lib/models';

/**
 * Which animation sequence takes the display from one graphic to another.
 *
 * Pulled out of `transition-engine.tsx` as a pure function so the one
 * decision that actually determines what a viewer SEES can be asserted
 * without a React renderer (`apps/web` has no test runner - see
 * `choreography.selftest.ts`, and the same reasoning behind
 * `transition-machine.selftest.ts`).
 *
 * A mode of `null` on either side means "nothing" - black, no container on
 * screen at all.
 */
export type Choreography =
  /** Nothing was showing and nothing is coming: no-op. */
  | 'none'
  /** A graphic -> nothing (Clear): the outgoing container animates away. */
  | 'exit-only'
  /** Nothing -> a graphic: the incoming container animates in. */
  | 'enter-only'
  /**
   * Same mode on both sides: the CONTAINER MUST NOT MOVE. Only the content
   * dissolves in place (`content-crossfade.tsx`). Two sequential drawers
   * land here.
   */
  | 'crossfade'
  /** Different modes: outgoing container out, brief empty hold, incoming container in. */
  | 'exit-hold-enter';

export function chooseChoreography(
  fromMode: PresentationMode | null,
  toMode: PresentationMode | null
): Choreography {
  if (!toMode && !fromMode) return 'none';
  if (!toMode) return 'exit-only';
  if (!fromMode) return 'enter-only';
  return fromMode === toMode ? 'crossfade' : 'exit-hold-enter';
}
