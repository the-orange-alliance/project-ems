import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';

import { StageLayer } from './composition.js';
import { CONTENT_CROSSFADE_MS } from './theme.js';

/**
 * The same-`mode` content dissolve: one graphic's payload fading out while
 * the next one's fades in, both stacked in the same design-space box, with
 * the presentation container (drawer/lower-third/fullscreen shell) never
 * moving. This is the "content crossfades in place" half of the transition
 * engine's choreography — the container half lives in
 * `stats-graphic-display.tsx`.
 *
 * WHY TWO MOUNTED LAYERS, AND WHY KEYFRAMES:
 * A crossfade needs the outgoing payload to still be on screen while the
 * incoming one comes up. A single wrapper whose opacity is toggled around a
 * content swap cannot do that — the moment the swap lands, the outgoing
 * content is already gone, so the best it can produce is "blank, then fade
 * the new one in", and in practice not even that:
 *
 *  - The previous implementation (a `ContentFade` wrapper in
 *    `stats-graphic-display.tsx`) set `opacity: 0` on a content change and
 *    flipped back to `1` two frames later, with `transition: opacity 300ms`
 *    permanently applied. Because the transition was always live, the trip
 *    to 0 ANIMATED rather than snapping: by the time the flip back to 1
 *    happened, computed opacity had barely left 1, and the "fade" was a
 *    ~2% dip nobody could see. Sequential same-mode graphics cut.
 *  - The double-`requestAnimationFrame` that flip relied on is also not
 *    dependable here: this renders inside an OBS (CEF) browser source,
 *    where the document is not always "visible" and rAF callbacks are
 *    spec-permitted never to fire at all.
 *
 * CSS keyframe animations sidestep both problems. An animation is bound to
 * the element declaratively and starts from its own `from` keyframe, so it
 * never depends on the browser having painted an intermediate start value,
 * and never depends on rAF running. (`theme.ts`'s live background gradient
 * already relies on exactly this in the same OBS context.)
 *
 * LAYER IDENTITY: layers are rendered from ONE keyed array, never from two
 * separate JSX slots. React reconciles a keyed array by key, so when the
 * outgoing layer moves from "the only child" to "the first of two", its DOM
 * node and component instances — including a live ECharts instance inside a
 * renderer — are preserved rather than torn down and re-created. Rendering
 * the two layers as separate JSX children would reconcile them by POSITION
 * instead, remounting the outgoing chart mid-dissolve and making it replay
 * its own entrance animation as it fades away.
 */

const FADE_IN_ANIMATION = 'ems-graphic-content-in';
const FADE_OUT_ANIMATION = 'ems-graphic-content-out';
const LAYER_CLASS = 'ems-graphic-content-layer';

/**
 * Keyframes for the two layer animations, plus a reduced-motion override.
 *
 * Reduced motion collapses the dissolve to an effectively instant cut
 * (1ms) rather than removing the animation outright: with no animation at
 * all both layers would sit at their base `opacity: 1` and double-expose
 * each other until the outgoing one is unmounted. Scoped to this module's
 * own class so it can never reach the container enter/exit animations the
 * transition engine drives.
 */
const contentCrossfadeKeyframes = `
@keyframes ${FADE_IN_ANIMATION} {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ${FADE_OUT_ANIMATION} {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .${LAYER_CLASS} {
    animation-duration: 1ms !important;
  }
}
`;

/** One payload the crossfade can have on screen. */
interface ContentSnapshot {
  key: string;
  spec: GraphicSpec;
  frame: VizFrame;
}

export interface ContentCrossfadeProps {
  /**
   * Durable identity of the graphic being presented — a CHANGE here is what
   * starts a dissolve. Pass `spec.id`, not anything derived from
   * `frame.asOfUtc`: a periodic data refresh re-renders the SAME authored
   * graphic with fresher numbers, and that must update the current layer in
   * place (so the renderer animates its own data change — see
   * `echartsTheme.animationDurationUpdate`) rather than dissolve a graphic
   * into a fresh copy of itself.
   */
  contentKey: string;
  spec: GraphicSpec;
  frame: VizFrame;
  /**
   * Renders one layer's full payload — chrome included, since the chrome
   * belongs to the graphic being dissolved, not to the shell it sits in.
   * Called with the live props for the incoming layer, and with the
   * snapshot it was last rendered with for the outgoing one.
   */
  renderLayer: (spec: GraphicSpec, frame: VizFrame) => ReactNode;
  durationMs?: number;
}

export const ContentCrossfade: FC<ContentCrossfadeProps> = ({
  contentKey,
  spec,
  frame,
  renderLayer,
  durationMs = CONTENT_CROSSFADE_MS
}) => {
  // What the last COMMITTED render actually put on screen. Written only
  // from an effect, never during render: a render-phase write would be
  // clobbered by React's StrictMode double-invoke (the second invoke would
  // read back the value the first one just wrote and snapshot the INCOMING
  // payload as the outgoing layer).
  const committedRef = useRef<ContentSnapshot>({
    key: contentKey,
    spec,
    frame
  });

  const [currentKey, setCurrentKey] = useState(contentKey);
  const [outgoing, setOutgoing] = useState<ContentSnapshot | null>(null);

  // React's "adjusting state when a prop changes" pattern: setting state
  // during render restarts THIS component's render immediately, before
  // anything is committed, so the very first render that shows the new
  // graphic already has the outgoing layer mounted alongside it. Doing this
  // from an effect instead would commit (and possibly paint) one frame with
  // the old payload already gone.
  if (currentKey !== contentKey) {
    setCurrentKey(contentKey);
    setOutgoing(
      committedRef.current.key === contentKey ? null : committedRef.current
    );
  }

  useEffect(() => {
    committedRef.current = { key: contentKey, spec, frame };
  }, [contentKey, spec, frame]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = setTimeout(() => {
      // Identity-compared so a dissolve that has already been superseded by
      // a newer one can never unmount the newer one's outgoing layer.
      setOutgoing((current) => (current === outgoing ? null : current));
    }, durationMs);
    return () => clearTimeout(timer);
  }, [outgoing, durationMs]);

  const layers: ContentSnapshot[] = outgoing
    ? [outgoing, { key: contentKey, spec, frame }]
    : [{ key: contentKey, spec, frame }];

  return (
    <>
      {/* Injected here (rather than globally) so this component works
          standalone wherever it is mounted — same convention as
          `containers/fullscreen.tsx` and its background keyframes. */}
      <style>{contentCrossfadeKeyframes}</style>
      {layers.map((layer) => {
        const isOutgoing = layer.key !== contentKey;
        return (
          <StageLayer
            key={layer.key}
            role={isOutgoing ? 'exit' : 'enter'}
            className={LAYER_CLASS}
            style={{
              animationName: isOutgoing
                ? FADE_OUT_ANIMATION
                : FADE_IN_ANIMATION,
              animationDuration: `${durationMs}ms`,
              animationTimingFunction: 'ease-in-out',
              // `both` holds the final keyframe, so a finished layer stays
              // where the dissolve left it instead of snapping back to its
              // base opacity for the frames before it is unmounted.
              animationFillMode: 'both',
              // A layer on its way out must never intercept a click in the
              // producer's live monitor.
              pointerEvents: isOutgoing ? 'none' : undefined
            }}
          >
            {renderLayer(layer.spec, layer.frame)}
          </StageLayer>
        );
      })}
    </>
  );
};

export default ContentCrossfade;
