import type { CSSProperties, FC } from 'react';

const ENTER_ANIMATION = 'ems-high-score-enter';
const STAR_ANIMATION = 'ems-high-score-star-dance';
const BANNER_CLASS = 'ems-high-score-banner';
const STAR_CLASS = 'ems-high-score-star';

/**
 * The panel itself animates once - a rise-and-settle on entry, then it holds
 * still. Only the two stars keep moving, rocking 15 degrees either side.
 *
 * This renders on the audience wall AND into the broadcast feed, so the
 * `preview-not-ready-alarm` reasoning applies: nothing on this surface may
 * flash or pulse. A slow rotation is neither - WCAG 2.3.1 governs luminance
 * flashes, and a glyph tilting back and forth changes no brightness at all.
 * Keeping the motion on two small glyphs rather than the panel is also what
 * keeps it tolerable behind a switcher: the score and the headline never move,
 * so nothing a camera or a reader is tracking shifts underneath them.
 *
 * The rock is deliberately slow and eased. Speeding it up turns an accent into
 * a distraction sitting next to the result the audience is trying to read.
 *
 * `prefers-reduced-motion` drops all of it - entry and dance - but keeps the
 * banner at full contrast: reduced motion is a request for less movement, never
 * a request to miss the information.
 */
const bannerKeyframes = `
@keyframes ${ENTER_ANIMATION} {
  from {
    opacity: 0;
    transform: translateY(35%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ${STAR_ANIMATION} {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
}

.${STAR_CLASS} {
  /* An inline box cannot be rotated; this is what makes the transform apply. */
  display: inline-block;
  animation: ${STAR_ANIMATION} 2.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .${BANNER_CLASS}, .${STAR_CLASS} {
    animation: none !important;
  }
}
`;

/**
 * The gold already used for the winning-alliance border in `alliance-score.tsx`,
 * with the same `ca` alpha every other surface on this screen uses (the alliance
 * score cards, the team rows, the stream overlay's backdrop). Flat rather than a
 * gradient so it reads as one of the screen's panels instead of a separate
 * sticker dropped on top of it.
 */
const GOLD = '#fcd34dca';

/**
 * Flanking stars. A raw glyph rather than an `@ant-design/icons` component,
 * matching the arrows in `alliance-team.tsx`: an icon font would need its own
 * baseline correction against this banner's 900-weight uppercase line, and the
 * glyph already sits on the text baseline for free.
 */
const STAR = '★';

export interface HighScoreBannerProps {
  /**
   * Render the banner invisibly but still in the layout.
   *
   * The two alliance columns on the full results screen are independent flex
   * columns, so a banner in one of them would push that column's team list down
   * and leave the two lists misaligned. The column that did NOT set the record
   * renders this same markup hidden, which reserves the exact height without a
   * hardcoded pixel value that would drift when a season's breakdown row count
   * changes the banner's font metrics.
   */
  hidden?: boolean;
}

export const HighScoreBanner: FC<HighScoreBannerProps> = ({ hidden }) => {
  const style: CSSProperties = {
    width: '100%',
    margin: '0.25rem 0 0.75rem',
    padding: '0.4rem 1rem',
    borderRadius: '0.6rem',
    backgroundColor: GOLD,
    border: '3px solid #ffffff40',
    boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.45)',
    // The stars flank the headline, so the row centres as a whole rather than
    // the text centring with the stars pushed to the edges.
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.9rem',
    // Dark text on gold: the only combination here that holds up both on a
    // 1080p wall at the back of a venue and composited over live video.
    color: '#1f1300',
    fontSize: '1.9rem',
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    animation: `${ENTER_ANIMATION} 0.55s cubic-bezier(0.16, 1, 0.3, 1) both`,
    ...(hidden ? { visibility: 'hidden' } : null)
  };

  return (
    <div
      className={BANNER_CLASS}
      style={style}
      aria-hidden={hidden ? true : undefined}
    >
      <style>{bannerKeyframes}</style>
      <span className={STAR_CLASS} aria-hidden='true'>
        {STAR}
      </span>
      <span>New High Score</span>
      <span className={STAR_CLASS} aria-hidden='true'>
        {STAR}
      </span>
    </div>
  );
};

/**
 * Compact variant for the stream overlay's L3 header, where it sits inboard of
 * the existing Red/Blue label. Sized to the header line rather than to the
 * column, so it adds no height to a fixed-height lower third.
 */
export const HighScoreBadge: FC = () => (
  <span
    className={BANNER_CLASS}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      marginInline: '0.6rem',
      padding: '0.1rem 0.6rem',
      borderRadius: '0.4rem',
      backgroundColor: GOLD,
      border: '2px solid #ffffff40',
      color: '#1f1300',
      fontSize: '1rem',
      fontWeight: 900,
      lineHeight: 1.4,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      animation: `${ENTER_ANIMATION} 0.55s cubic-bezier(0.16, 1, 0.3, 1) both`
    }}
  >
    <style>{bannerKeyframes}</style>
    <span className={STAR_CLASS} aria-hidden='true'>
      {STAR}
    </span>
    <span>New High Score</span>
    <span className={STAR_CLASS} aria-hidden='true'>
      {STAR}
    </span>
  </span>
);

export default HighScoreBanner;
