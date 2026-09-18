import type { FC, PropsWithChildren } from 'react';
import type { PresentationMode } from '@toa-lib/models';
import type { Motion } from './transition-machine.js';
import {
  motionAnimationName,
  motionStyle,
  useMotionSample
} from './content-crossfade.js';

const keyframes = `
@keyframes ems-container-fullscreen-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes ems-container-fullscreen-exit { from { opacity: 1; } to { opacity: 0; } }
@keyframes ems-container-drawer-left-enter { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes ems-container-drawer-left-exit { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@keyframes ems-container-drawer-right-enter { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes ems-container-drawer-right-exit { from { transform: translateX(0); } to { transform: translateX(100%); } }
@keyframes ems-container-lower-third-enter { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes ems-container-lower-third-exit { from { transform: translateY(0); } to { transform: translateY(100%); } }
`;
/** CSS samples the same motion start/duration as the machine, including partial late-join animations. */
export const TransitionContainer: FC<
  PropsWithChildren<{
    mode: PresentationMode;
    motion: Motion | null;
    nowMs: number;
  }>
> = ({ mode, motion, nowMs, children }) => {
  const sampledAtMs = useMotionSample(motion, nowMs);
  const sampledKeyframes = keyframes.replace(
    /ems-container-(fullscreen|drawer-left|drawer-right|lower-third)-(enter|exit)/g,
    (name) => motionAnimationName(name, motion)
  );
  return (
    <div
      className='ems-graphic-motion'
      data-container-mode={mode}
      style={{
        width: '100%',
        height: '100%',
        overflow: mode === 'fullscreen' ? undefined : 'hidden',
        ...motionStyle(
          `ems-container-${mode}-${motion?.kind}`,
          motion,
          sampledAtMs
        )
      }}
    >
      <style>{sampledKeyframes}</style>
      {children}
    </div>
  );
};
