import { useState, type FC, type ReactNode } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';

import {
  FadeInOut,
  SlideInBottom,
  SlideInLeft,
  SlideInRight
} from 'src/components/animations/index.js';
import AbsolouteLocator from 'src/components/util/absoloute-locator.js';

import {
  useGraphicTransition,
  type GraphicSnapshot
} from './transition-engine.js';
import ContentCrossfade from './content-crossfade.js';
import { CONTENT_CROSSFADE_MS } from './theme.js';
import { FullscreenPayload, FullscreenShell } from './containers/fullscreen.js';
import { DrawerPayload, DrawerShell } from './containers/drawer.js';
import {
  LowerThirdPayload,
  LowerThirdShell
} from './containers/lower-third.js';
import { GraphicRenderer } from './renderers/index.js';

export interface StatsGraphicDisplayProps {
  spec: GraphicSpec | null;
  frame: VizFrame | null;
  /**
   * Increment to replay the transition into the current graphic. Only
   * preview (PVW) screens pass this - see `useGraphicTransition`'s own note
   * on why it is never wired to the program bus.
   */
  replayNonce?: number;
  /** The graphic a replay cuts back to before transitioning - for a preview screen, what is on the program bus. */
  replayFrom?: GraphicSnapshot | null;
  /** Off-air consumers may report renderer errors; PGM adds no diagnostic UI. */
  onRenderError?: (error: Error, spec: GraphicSpec, frame: VizFrame) => void;
}

/**
 * Root on-air component for the stats-graphics system.
 *
 * Renders as a fully transparent broadcast source — a live, transparent
 * browser source composited over live video — so it renders NOTHING (no
 * placeholder, no spinner, no text) whenever there is no graphic to show.
 * That's the default state most of the time.
 *
 * Takes `spec`/`frame` only, deliberately no separate `onAir` flag: the
 * caller's `LiveGraphicState.spec`/`.frame` already ARE `state.program`'s
 * content specifically (see `toLegacyState` in the realtime relay) - null
 * exactly when nothing is on air, non-null exactly when something is. A
 * second, independent `onAir` boolean here previously raced the transition
 * engine's own `phase` (see the comment on the removed guard below, in git
 * history) and silently ate every exit animation.
 */
export const StatsGraphicDisplay: FC<StatsGraphicDisplayProps> = ({
  spec,
  frame,
  replayNonce,
  replayFrom,
  onRenderError
}) => {
  const { phase, displayedSpec, displayedFrame, cutting } =
    useGraphicTransition(spec, frame, replayNonce, replayFrom);
  const [failedGraphic, setFailedGraphic] = useState<GraphicSnapshot | null>(
    null
  );
  const reportRenderError = (
    error: Error,
    failedSpec: GraphicSpec,
    failedFrame: VizFrame
  ) => {
    setFailedGraphic({ spec: failedSpec, frame: failedFrame });
    onRenderError?.(error, failedSpec, failedFrame);
  };

  // A replay's hard cut must land instantaneously. Every shared animation
  // component starts at `localIn: false` and animates toward `in` on mount,
  // so the only way to make a commit appear with no motion at all is to
  // collapse its duration (and any entrance delay) to zero for that commit -
  // a `transition: ... 0s` simply snaps. Normal commits are untouched.
  const seconds = (normal: number) => (cutting ? 0 : normal);
  const delay = (normal: number) => (cutting ? 0 : normal);
  const crossfadeMs = cutting ? 0 : CONTENT_CROSSFADE_MS;

  // Fully transparent when there is nothing to keep rendering. The shared
  // transition engine owns this decision ENTIRELY through
  // `displayedSpec`/`displayedFrame`: it deliberately keeps them alive
  // through the `exiting` phase so a Clear can finish its exit animation,
  // and resets them to `null` itself once that exit (or a same-tick
  // nothing-to-nothing no-op) actually completes.
  //
  // This must NOT also gate on the raw `onAir` prop (a previous version
  // did, as `!onAir && phase !== 'exiting'`) - `onAir` flips on the SAME
  // render as the props that cause it, while `phase` only catches up on
  // the NEXT render (`useGraphicTransition`'s `useEffect` runs after
  // commit). On the very render where a Clear lands, `onAir` is already
  // `false` but `phase` is still whatever it was a moment ago (`'shown'`),
  // so that check returned `null` - UNMOUNTING the whole container - one
  // render before the engine could ever flip `phase` to `'exiting'`. The
  // very next render then remounted it fresh, already in its offscreen
  // position, with no prior on-screen state left for the CSS transition to
  // animate from: an instant cut with zero visible motion, confirmed by
  // watching the actual DOM node get removed and replaced within ~200ms of
  // a Clear (nowhere near the exit's real ~1.25s duration). Removing the
  // prop entirely (rather than just the guard) makes it impossible to
  // reintroduce this same race by accident.
  if (!displayedSpec || !displayedFrame) {
    return null;
  }
  // Remove the shell/title as well as the renderer after a crash. A corrected
  // snapshot recovers naturally; diagnostic chrome is owned by off-air callers.
  if (
    failedGraphic?.spec === displayedSpec &&
    failedGraphic.frame === displayedFrame
  )
    return null;

  // True for both 'entering' and 'shown', false for 'exiting' (and,
  // vacuously, 'idle'/'holding' — already handled by the guard above).
  // This is the crux of the same-mode-never-re-animates rule: a same-`mode`
  // re-cue goes 'shown' -> 'entering' -> 'shown' without ever passing
  // through 'exiting'/'holding', so `containerIn` never becomes false and
  // the container's animation component never receives a falsy `in` — it
  // holds its already-settled position the entire time. Only a
  // different-`mode` transition (which the engine always routes through
  // 'exiting' then 'holding' before the new container's fresh 'entering')
  // ever makes `containerIn` go false.
  const containerIn = phase === 'entering' || phase === 'shown';

  // The other half of that rule: while the container holds still, the
  // content DISSOLVES from the outgoing graphic into the incoming one (see
  // `content-crossfade.tsx`). Everything that belongs to the graphic — its
  // title/subtitle chrome included — goes inside the crossfaded payload, so
  // the chrome dissolves with its own graphic instead of snapping to the
  // incoming text while the body fades. Only the shell (the drawer panel,
  // the lower-third band, the fullscreen backdrop) stays mounted and
  // motionless outside it.
  //
  // Keyed on `spec.id`, the durable identity of the AUTHORED graphic: two
  // sequential timeline items are two different ids and therefore dissolve,
  // while a periodic refresh of the item already on air carries the same id
  // with a fresher `frame` and updates the mounted layer in place, letting
  // the renderer animate its own data change instead of dissolving a
  // graphic into a fresh copy of itself.
  const crossfade = (
    renderLayer: (spec: GraphicSpec, frame: VizFrame) => ReactNode
  ) => (
    <ContentCrossfade
      contentKey={displayedSpec.id}
      spec={displayedSpec}
      frame={displayedFrame}
      renderLayer={renderLayer}
      durationMs={crossfadeMs}
    />
  );

  // `right={0} bottom={0}` (full `inset: 0`), not just `top`/`left`: without
  // all four, `AbsolouteLocator` has no explicit size and shrink-wraps to
  // its content instead of covering its actual host - and its content here
  // is one of the `Slide*`/`FadeInOut` animation wrappers below, which size
  // THEMSELVES off their own parent (`width`/`height: '100%'`). With only
  // `top`/`left` set, that was circular: nothing in the chain ever resolved
  // a real box, so `Stage` (mounted further inside) fell back to measuring
  // the actual browser viewport instead of whatever box this is really
  // mounted in - correct by coincidence for a full-bleed audience display,
  // but very wrong for the producer's small live-monitor preview, where the
  // graphic would size itself to the whole browser window and render
  // almost entirely outside the tiny visible crop. `inset: 0` gives every
  // layer in the chain a real, containing-block-based size immediately.
  switch (displayedSpec.mode) {
    case 'fullscreen':
      return (
        <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
          <FadeInOut in={containerIn} duration={seconds(0.5)}>
            <FullscreenShell>
              {crossfade((layerSpec, layerFrame) => (
                <FullscreenPayload
                  title={layerSpec.title}
                  subtitle={layerSpec.subtitle}
                >
                  <GraphicRenderer
                    frame={layerFrame}
                    spec={layerSpec}
                    onRenderError={reportRenderError}
                  />
                </FullscreenPayload>
              ))}
            </FullscreenShell>
          </FadeInOut>
        </AbsolouteLocator>
      );

    case 'drawer-left':
      return (
        <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
          <SlideInLeft
            in={containerIn}
            duration={seconds(1.25)}
            inDelay={delay(0.75)}
          >
            <DrawerShell side='left'>
              {crossfade((layerSpec, layerFrame) => (
                <DrawerPayload
                  title={layerSpec.title}
                  subtitle={layerSpec.subtitle}
                >
                  <GraphicRenderer
                    frame={layerFrame}
                    spec={layerSpec}
                    onRenderError={reportRenderError}
                  />
                </DrawerPayload>
              ))}
            </DrawerShell>
          </SlideInLeft>
        </AbsolouteLocator>
      );

    case 'drawer-right':
      return (
        <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
          <SlideInRight
            in={containerIn}
            duration={seconds(1.25)}
            inDelay={delay(0.75)}
          >
            <DrawerShell side='right'>
              {crossfade((layerSpec, layerFrame) => (
                <DrawerPayload
                  title={layerSpec.title}
                  subtitle={layerSpec.subtitle}
                >
                  <GraphicRenderer
                    frame={layerFrame}
                    spec={layerSpec}
                    onRenderError={reportRenderError}
                  />
                </DrawerPayload>
              ))}
            </DrawerShell>
          </SlideInRight>
        </AbsolouteLocator>
      );

    case 'lower-third':
      return (
        <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
          <SlideInBottom
            in={containerIn}
            duration={seconds(1.25)}
            inDelay={delay(0.75)}
          >
            <LowerThirdShell>
              {crossfade((layerSpec, layerFrame) => (
                <LowerThirdPayload
                  title={layerSpec.title}
                  subtitle={layerSpec.subtitle}
                >
                  <GraphicRenderer
                    frame={layerFrame}
                    spec={layerSpec}
                    onRenderError={reportRenderError}
                  />
                </LowerThirdPayload>
              ))}
            </LowerThirdShell>
          </SlideInBottom>
        </AbsolouteLocator>
      );

    default:
      // Exhaustive over `PresentationMode` — nothing rather than risk
      // rendering an unstyled/unpositioned graphic on air.
      return null;
  }
};

export default StatsGraphicDisplay;
