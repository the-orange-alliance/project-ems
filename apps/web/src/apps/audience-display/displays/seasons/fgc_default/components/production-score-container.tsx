import { FC, useLayoutEffect, useRef } from 'react';

const MIN_FONT_SIZE = 8;

/**
 * Shrinks `text` from `baseFontSize` until it fits inside `box`'s content area
 * (the box itself never resizes). MEKTON is wide, so three-digit scores at the
 * 140px base size overflow the 250px tile. Returns the applied size in px.
 */
export function fitFontSize(
  box: HTMLElement,
  text: HTMLElement,
  baseFontSize: number
): number {
  const availWidth = box.clientWidth;
  const availHeight = box.clientHeight;
  const textWidth = () => Math.max(text.offsetWidth, text.scrollWidth);
  const textHeight = () => Math.max(text.offsetHeight, text.scrollHeight);
  const overflows = () =>
    textWidth() > availWidth || textHeight() > availHeight;

  let size = baseFontSize;
  text.style.fontSize = `${size}px`;
  if (!availWidth || !availHeight || !overflows()) return size;

  // Glyph width scales linearly with font size, so one proportional jump gets
  // close; the step-down loop absorbs rounding and line-wrap effects.
  const scale = Math.min(availWidth / textWidth(), availHeight / textHeight());
  size = Math.max(MIN_FONT_SIZE, Math.floor(size * scale));
  text.style.fontSize = `${size}px`;
  while (size > MIN_FONT_SIZE && overflows()) {
    size -= 1;
    text.style.fontSize = `${size}px`;
  }
  return size;
}

/**
 * Large number + label tile used by the season-specific production overlays
 * (see fgc_2025/match-production-view.tsx and fgc_2026/match-production-view.tsx).
 */
export const ScoreContainer: FC<{
  number: string;
  label: string;
  wide?: boolean;
  medium?: boolean;
  bg?: string;
  color?: string;
  smallFont?: boolean;
}> = ({ number, label, medium, wide, bg, color, smallFont }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const baseFontSize = smallFont ? 40 : 140;

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => fitFontSize(box, text, baseFontSize);
    fit();

    // Medium/wide tiles are vw-based, and MEKTON may finish loading after the
    // first layout - refit on either.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(box);
    document.fonts?.addEventListener?.('loadingdone', fit);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', fit);
    };
  }, [number, baseFontSize, medium, wide]);

  return (
    <div>
      <div
        ref={boxRef}
        className='production-score-container'
        style={{
          height: '200px',
          width: wide
            ? 'calc(100vw / 2) '
            : medium
              ? 'calc(100vw / 4)'
              : '250px',
          border: '20px solid black',
          textAlign: 'center',
          fontSize: `${baseFontSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Mekton',
          backgroundColor: bg ? bg : undefined,
          color: color ? color : undefined,
          transition: 'color 0.5s ease'
        }}
      >
        <span ref={textRef}>{number}</span>
      </div>
      <h3 style={{ width: '100%', textAlign: 'center', marginBottom: 0 }}>
        {label}
      </h3>
    </div>
  );
};
