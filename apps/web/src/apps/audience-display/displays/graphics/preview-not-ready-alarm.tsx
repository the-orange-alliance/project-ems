import type { FC } from 'react';

import { fontFamily } from './theme.js';

const FLASH_ANIMATION = 'ems-preview-not-ready-flash';
const ALARM_CLASS = 'ems-preview-not-ready-alarm';

/**
 * Flash rate is deliberately 1.4Hz and MUST NOT be raised.
 *
 * WCAG 2.3.1 caps general flashing at three per second, and this alarm sits on
 * a multiviewer that an operator stares at for the length of a show. The point
 * is to be impossible to miss, which a slow high-contrast strobe already
 * achieves - going faster only buys a seizure risk.
 *
 * `prefers-reduced-motion` stops the motion but keeps the alarm at full
 * contrast. A failure indicator must never be animated away into invisibility:
 * reduced motion is a request for less movement, never a request to be left
 * unaware that the next cue is dead.
 */
const alarmKeyframes = `
@keyframes ${FLASH_ANIMATION} {
  0%, 49% {
    background-color: rgba(196, 8, 8, 0.94);
    border-color: #ffec3d;
  }
  50%, 100% {
    background-color: rgba(20, 0, 0, 0.94);
    border-color: #ff4d4f;
  }
}

@media (prefers-reduced-motion: reduce) {
  .${ALARM_CLASS} {
    animation: none !important;
    background-color: rgba(196, 8, 8, 0.94) !important;
    border-color: #ffec3d !important;
  }
}
`;

export interface PreviewNotReadyAlarmProps {
  /** Exact producer-facing reason the next cue cannot be prepared. */
  reason: string;
}

/**
 * Full-bleed alarm for the preview (PVW) screen: the NEXT cue is broken and
 * pressing Go will put nothing on air.
 *
 * The failure it reports is not a guess. `usePreviewFrame` runs the identical
 * `queryGraphicFrame` round trip that `PlaybackNavigation.prepareCueAt` will
 * run when the transport advances onto this item, so a reason shown here is
 * the reason the cue will be marked `failed` and the following `take` will
 * reject `NOT_READY`.
 *
 * WHY THIS IS ALLOWED TO BE LOUD, AND WHERE IT MUST NEVER GO:
 * The PVW screen already carries multiviewer chrome (a red border and two
 * PREVIEW bars - see `stats-graphic-preview-display.tsx`) precisely because it
 * never goes to air. That is what makes a full-bleed strobe safe HERE and
 * nowhere else. This component must never be rendered from
 * `StatsGraphicDisplay`, which backs both the program bus
 * (`display-switcher.tsx`) and the producer's `live-monitor.tsx` - putting it
 * there would strobe the PGM monitor and, worse, a transparent broadcast
 * source composited over live video.
 */
export const PreviewNotReadyAlarm: FC<PreviewNotReadyAlarmProps> = ({
  reason
}) => (
  <div
    className={ALARM_CLASS}
    role='alert'
    aria-live='assertive'
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2.5%',
      padding: '4%',
      textAlign: 'center',
      fontFamily,
      color: '#fff',
      border: '8px solid #ffec3d',
      boxSizing: 'border-box',
      animation: `${FLASH_ANIMATION} 0.72s steps(1, end) infinite`,
      // Chrome over a monitor, never an interactive surface.
      pointerEvents: 'none',
      userSelect: 'none'
    }}
  >
    <style>{alarmKeyframes}</style>

    {/* Sized in viewport units so the message fills whatever the multiviewer
        tile actually is, rather than a fixed size tuned to one monitor. */}
    <div
      style={{
        fontSize: 'min(9vw, 12vh)',
        fontWeight: 900,
        lineHeight: 1.05,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        textShadow: '0 4px 18px rgba(0, 0, 0, 0.75)'
      }}
    >
      Next cue
      <br />
      will not fire
    </div>

    <div
      style={{
        fontSize: 'min(3.2vw, 4.2vh)',
        fontWeight: 700,
        lineHeight: 1.25,
        maxWidth: '90%',
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.75)'
      }}
    >
      {reason}
    </div>

    <div
      style={{
        fontSize: 'min(2.2vw, 3vh)',
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        opacity: 0.92
      }}
    >
      Fix or skip this item before taking
    </div>
  </div>
);

export default PreviewNotReadyAlarm;
