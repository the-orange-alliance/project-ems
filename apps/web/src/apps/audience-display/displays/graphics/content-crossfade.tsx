import { useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { StageLayer } from './composition.js';
import type { ContentLayer, Motion } from './transition-machine.js';

/** Sample only when a leg starts. CSS advances from this offset between React renders. */
export function useMotionSample(motion: Motion | null, nowMs: number): number {
  const identity = motion
    ? `${motion.kind}:${motion.startMs}:${motion.durationMs}`
    : 'none';
  const [sample, setSample] = useState({ identity, atMs: nowMs });
  if (sample.identity !== identity) {
    setSample({ identity, atMs: nowMs });
    return nowMs;
  }
  return sample.atMs;
}
export function motionAnimationName(
  name: string,
  motion: Motion | null
): string {
  return motion
    ? `${name}-${motion.startMs}-${motion.durationMs}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )
    : name;
}

export function motionStyle(
  name: string,
  motion: Motion | null,
  nowMs: number
): CSSProperties {
  return motion
    ? {
        animationName: motionAnimationName(name, motion),
        animationDuration: `${motion.durationMs}ms`,
        animationDelay: `${-Math.max(0, nowMs - motion.startMs)}ms`,
        animationTimingFunction: 'ease-in-out',
        animationFillMode: 'both'
      }
    : {};
}
export const contentCrossfadeKeyframes = `
@keyframes ems-graphic-content-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ems-graphic-content-out { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ems-graphic-motion { animation-duration: 1ms !important; animation-delay: 0ms !important; }
}
`;
export interface ContentCrossfadeProps {
  layers: ContentLayer[];
  motion: Motion | null;
  nowMs: number;
  renderLayer: (layer: ContentLayer) => ReactNode;
}
/** Presentation only: the production machine owns both mounted layers and their deadline. */
export const ContentCrossfade: FC<ContentCrossfadeProps> = ({
  layers,
  motion,
  nowMs,
  renderLayer
}) => {
  const sampledAtMs = useMotionSample(motion, nowMs);
  const keyframes = contentCrossfadeKeyframes.replace(
    /ems-graphic-content-(in|out)/g,
    (name) => motionAnimationName(name, motion)
  );
  return (
    <>
      <style>{keyframes}</style>
      {layers.map((layer) => (
        <StageLayer
          key={layer.key}
          role={layer.role}
          className='ems-graphic-motion'
          style={{
            ...motionStyle(
              layer.role === 'exit'
                ? 'ems-graphic-content-out'
                : 'ems-graphic-content-in',
              motion,
              sampledAtMs
            ),
            pointerEvents: layer.role === 'exit' ? 'none' : undefined
          }}
        >
          {renderLayer(layer)}
        </StageLayer>
      ))}
    </>
  );
};
export default ContentCrossfade;
